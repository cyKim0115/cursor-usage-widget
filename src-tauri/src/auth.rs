use std::path::PathBuf;

use thiserror::Error;

#[derive(Debug, Error)]
pub enum AuthError {
    #[error("NeedLogin: Cursor DB not found at {0}")]
    DbMissing(String),
    #[error("NeedLogin: cursorAuth/accessToken missing")]
    TokenMissing,
    #[error("NeedLogin: failed to read Cursor DB: {0}")]
    Db(String),
}

pub fn default_db_path() -> PathBuf {
    let appdata = std::env::var_os("APPDATA").expect("APPDATA");
    PathBuf::from(appdata)
        .join("Cursor")
        .join("User")
        .join("globalStorage")
        .join("state.vscdb")
}

/// Reads the Cursor access token. Callers must never log the return value.
pub fn read_access_token(db_path: &PathBuf) -> Result<String, AuthError> {
    if !db_path.is_file() {
        return Err(AuthError::DbMissing(db_path.display().to_string()));
    }

    let con = rusqlite::Connection::open_with_flags(
        db_path,
        rusqlite::OpenFlags::SQLITE_OPEN_READ_ONLY,
    )
    .map_err(|e| AuthError::Db(e.to_string()))?;

    let token: Option<String> = con
        .query_row(
            "SELECT value FROM ItemTable WHERE key = ?1",
            ["cursorAuth/accessToken"],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| AuthError::Db(e.to_string()))?;

    match token {
        Some(t) if !t.is_empty() => Ok(t),
        _ => Err(AuthError::TokenMissing),
    }
}

trait OptionalExt<T> {
    fn optional(self) -> rusqlite::Result<Option<T>>;
}

impl<T> OptionalExt<T> for rusqlite::Result<T> {
    fn optional(self) -> rusqlite::Result<Option<T>> {
        match self {
            Ok(v) => Ok(Some(v)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e),
        }
    }
}
