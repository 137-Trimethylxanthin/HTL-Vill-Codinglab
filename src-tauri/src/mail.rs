use crate::config::SmtpSettings;
use crate::error::{AppError, AppResult};
use lettre::Message;

use lettre::message::header::ContentType;
use lettre::message::{Attachment, Mailbox, MultiPart, SinglePart};
use lettre::transport::smtp::authentication::Credentials;
use lettre::{SmtpTransport, Transport};
use std::time::Duration;

pub fn is_valid_email(address: &str) -> bool {
    address.len() <= 254
        && address.parse::<lettre::Address>().is_ok()
        && address.split('@').nth(1).is_some_and(|domain| domain.contains('.'))
}

fn escape_html(s: &str) -> String {
    s.replace('&', "&amp;").replace('<', "&lt;").replace('>', "&gt;").replace('"', "&quot;")
}

fn mailboxes(from: &str, to: &str) -> AppResult<(Mailbox, Mailbox)> {
    let from = from.parse::<Mailbox>().map_err(|_| AppError::NoSmtp)?;
    if !is_valid_email(to) {
        return Err(AppError::InvalidEmail);
    }
    let to = to.parse::<Mailbox>().map_err(|_| AppError::InvalidEmail)?;
    Ok((from, to))
}

pub fn certificate_message(from: &str, to: &str, name: &str, qr_url: &str, pdf: Vec<u8>) -> AppResult<Message> {
    let (from, to) = mailboxes(from, to)?;
    let text = format!(
        "Hallo {name}!\n\nSuper gemacht! Hier ist dein Zertifikat vom CodingLab.\n\nMehr über die HTL Villach: {qr_url}\n"
    );
    let html = format!(
        "<p>Hallo {name}!</p><p>Super gemacht! Hier ist dein Zertifikat vom CodingLab.</p><p>Mehr über die HTL Villach: <a href=\"{url}\">{url}</a></p>",
        name = escape_html(name),
        url = escape_html(qr_url)
    );
    let pdf_type = ContentType::parse("application/pdf").map_err(|e| AppError::Mail(e.to_string()))?;
    Message::builder()
        .from(from)
        .to(to)
        .subject("Dein CodingLab-Zertifikat")
        .multipart(
            MultiPart::mixed()
                .multipart(MultiPart::alternative().singlepart(SinglePart::plain(text)).singlepart(SinglePart::html(html)))
                .singlepart(Attachment::new("Zertifikat.pdf".to_string()).body(pdf, pdf_type)),
        )
        .map_err(|e| AppError::Mail(e.to_string()))
}

pub fn test_message(from: &str, to: &str) -> AppResult<Message> {
    let (from, to) = mailboxes(from, to)?;
    Message::builder()
        .from(from)
        .to(to)
        .subject("CodingLab Test-Mail")
        .body("Die E-Mail-Einstellungen funktionieren.".to_string())
        .map_err(|e| AppError::Mail(e.to_string()))
}

pub fn send(settings: &SmtpSettings, password: Option<&str>, message: &Message) -> AppResult<()> {
    if settings.host.is_empty() {
        return Err(AppError::NoSmtp);
    }
    let builder = if settings.starttls {
        SmtpTransport::starttls_relay(&settings.host)
    } else {
        SmtpTransport::relay(&settings.host)
    }
    .map_err(|e| AppError::Mail(e.to_string()))?;
    let mut builder = builder.port(settings.port).timeout(Some(Duration::from_secs(15)));
    if !settings.username.is_empty() {
        builder = builder.credentials(Credentials::new(
            settings.username.clone(),
            password.unwrap_or_default().to_string(),
        ));
    }
    builder.build().send(message).map(|_| ()).map_err(|e| AppError::Mail(e.to_string()))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn checks_addresses() {
        assert!(is_valid_email("lea@example.org"));
        assert!(is_valid_email("lea.maier+lab@schule.ac.at"));
        assert!(!is_valid_email("lea@localhost"));
        assert!(!is_valid_email("lea example.org"));
        assert!(!is_valid_email("@example.org"));
        assert!(!is_valid_email(&format!("{}@example.org", "a".repeat(260))));
    }

    #[test]
    fn builds_the_certificate_mail_with_attachment() {
        let msg = certificate_message(
            "CodingLab <lab@htl-villach.at>",
            "lea@example.org",
            "Lea",
            "https://www.htl-villach.at",
            b"%PDF-1.7 test".to_vec(),
        )
        .unwrap();
        let raw = String::from_utf8_lossy(&msg.formatted()).to_string();
        assert!(raw.contains("To: lea@example.org"));
        assert!(raw.contains("Subject: Dein CodingLab-Zertifikat"));
        assert!(raw.contains("Zertifikat.pdf"));
        assert!(raw.contains("application/pdf"));
    }

    #[test]
    fn refuses_bad_addresses() {
        assert!(matches!(
            certificate_message("lab@htl-villach.at", "nope", "Lea", "x", vec![]),
            Err(AppError::InvalidEmail)
        ));
        assert!(matches!(
            certificate_message("", "lea@example.org", "Lea", "x", vec![]),
            Err(AppError::NoSmtp)
        ));
    }

    #[test]
    fn escapes_html_in_names() {
        let msg = certificate_message("lab@htl-villach.at", "lea@example.org", "<b>Lea</b>", "x", vec![]).unwrap();
        let raw = String::from_utf8_lossy(&msg.formatted()).to_string();
        // The plain-text part may keep the name as typed; the HTML part must be escaped.
        assert!(raw.contains("&lt;b&gt;Lea&lt;/b&gt;"));
        assert!(!raw.contains("<p>Hallo <b>Lea</b>"));
    }

    #[test]
    fn send_without_host_is_no_smtp() {
        let settings = SmtpSettings::default();
        let msg = test_message("lab@htl-villach.at", "lea@example.org").unwrap();
        assert!(matches!(send(&settings, None, &msg), Err(AppError::NoSmtp)));
    }
}
