use serde::{Deserialize, Serialize};
use thiserror::Error;

const API_BASE: &str = "https://api2.cursor.sh";
const USAGE_PATH: &str = "/aiserver.v1.DashboardService/GetCurrentPeriodUsage";
const PLAN_PATH: &str = "/aiserver.v1.DashboardService/GetPlanInfo";

#[derive(Debug, Error)]
pub enum UsageError {
    #[error("FetchError: {0}")]
    Fetch(String),
    #[error("FetchError: parse failed: {0}")]
    Parse(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TrackUsage {
    pub label: String,
    pub percent_used: Option<f64>,
    pub remaining_percent: Option<f64>,
    pub display_message: Option<String>,
    pub source_field: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UsageSnapshot {
    pub state: String,
    pub plan_name: Option<String>,
    pub included_usd: Option<f64>,
    pub cursor: TrackUsage,
    pub other: TrackUsage,
    pub error: Option<String>,
}

#[derive(Debug, Deserialize)]
struct UsageResponse {
    #[serde(rename = "planUsage")]
    plan_usage: Option<PlanUsage>,
    #[serde(rename = "autoModelSelectedDisplayMessage")]
    auto_msg: Option<String>,
    #[serde(rename = "namedModelSelectedDisplayMessage")]
    named_msg: Option<String>,
}

#[derive(Debug, Deserialize)]
struct PlanUsage {
    #[serde(rename = "autoPercentUsed")]
    auto_percent_used: Option<f64>,
    #[serde(rename = "apiPercentUsed")]
    api_percent_used: Option<f64>,
}

#[derive(Debug, Deserialize)]
struct PlanInfoResponse {
    #[serde(rename = "planInfo")]
    plan_info: Option<PlanInfo>,
}

#[derive(Debug, Deserialize)]
struct PlanInfo {
    #[serde(rename = "planName")]
    plan_name: Option<String>,
    #[serde(rename = "includedAmountCents")]
    included_amount_cents: Option<f64>,
}

fn post_json(path: &str, token: &str) -> Result<serde_json::Value, UsageError> {
    let url = format!("{API_BASE}{path}");
    let agent = ureq::AgentBuilder::new()
        .timeout_connect(std::time::Duration::from_secs(10))
        .timeout_read(std::time::Duration::from_secs(30))
        .build();

    let resp = agent
        .post(&url)
        .set("Content-Type", "application/json")
        .set("Connect-Protocol-Version", "1")
        .set("Authorization", &format!("Bearer {token}"))
        .set("User-Agent", "cursor-usage-widget/0.1")
        .send_string("{}")
        .map_err(|e| UsageError::Fetch(e.to_string()))?;

    resp.into_json::<serde_json::Value>()
        .map_err(|e| UsageError::Parse(e.to_string()))
}

fn track(label: &str, source: &str, percent: Option<f64>, message: Option<String>) -> TrackUsage {
    let remaining = percent.map(|p| (100.0 - p).max(0.0));
    TrackUsage {
        label: label.to_string(),
        percent_used: percent,
        remaining_percent: remaining,
        display_message: message,
        source_field: source.to_string(),
    }
}

pub fn fetch_usage(token: &str) -> Result<UsageSnapshot, UsageError> {
    let usage_val = post_json(USAGE_PATH, token)?;
    let plan_val = post_json(PLAN_PATH, token).unwrap_or(serde_json::json!({}));

    let usage: UsageResponse =
        serde_json::from_value(usage_val).map_err(|e| UsageError::Parse(e.to_string()))?;
    let plan: PlanInfoResponse =
        serde_json::from_value(plan_val).unwrap_or(PlanInfoResponse { plan_info: None });

    let plan_usage = usage.plan_usage.unwrap_or(PlanUsage {
        auto_percent_used: None,
        api_percent_used: None,
    });

    let included_usd = plan
        .plan_info
        .as_ref()
        .and_then(|p| p.included_amount_cents)
        .map(|c| c / 100.0);

    Ok(UsageSnapshot {
        state: "OK".into(),
        plan_name: plan.plan_info.and_then(|p| p.plan_name),
        included_usd,
        cursor: track(
            "Cursor",
            "planUsage.autoPercentUsed",
            plan_usage.auto_percent_used,
            usage.auto_msg,
        ),
        other: track(
            "Other",
            "planUsage.apiPercentUsed",
            plan_usage.api_percent_used,
            usage.named_msg,
        ),
        error: None,
    })
}

pub fn need_login(message: String) -> UsageSnapshot {
    UsageSnapshot {
        state: "NeedLogin".into(),
        plan_name: None,
        included_usd: None,
        cursor: track("Cursor", "planUsage.autoPercentUsed", None, None),
        other: track("Other", "planUsage.apiPercentUsed", None, None),
        error: Some(message),
    }
}

pub fn fetch_error(message: String) -> UsageSnapshot {
    UsageSnapshot {
        state: "FetchError".into(),
        plan_name: None,
        included_usd: None,
        cursor: track("Cursor", "planUsage.autoPercentUsed", None, None),
        other: track("Other", "planUsage.apiPercentUsed", None, None),
        error: Some(message),
    }
}
