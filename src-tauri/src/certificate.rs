use crate::error::AppResult;
use serde::Deserialize;

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CertMission {
    pub id: String,
    pub title: String,
    pub stars: u8,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CertMap {
    pub rows: Vec<String>,
    pub path: Vec<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CertificateData {
    pub pilot_name: String,
    pub total_stars: u32,
    pub max_stars: u32,
    pub missions: Vec<CertMission>,
    pub date: String,
    pub qr_url: String,
    pub map: Option<CertMap>,
}

use crate::error::AppError;
use printpdf::{
    Color, Line, LinePoint, Mm, Op, PaintMode, ParsedFont, PdfDocument, PdfFontHandle, PdfPage,
    PdfSaveOptions, Point, Polygon, PolygonRing, Pt, Rgb, TextItem, TextMatrix, WindingOrder,
};

const FONT: &[u8] = include_bytes!("../fonts/NotoSans-Bold.ttf");

fn rgb(r: f32, g: f32, b: f32) -> Color {
    Color::Rgb(Rgb::new(r, g, b, None))
}

const HTL: (f32, f32, f32) = (0.16, 0.29, 0.62);
const DRONE: (f32, f32, f32) = (0.98, 0.45, 0.09);
const INK: (f32, f32, f32) = (0.1, 0.12, 0.16);
const MUTED: (f32, f32, f32) = (0.45, 0.48, 0.55);
const GOLD: (f32, f32, f32) = (0.98, 0.76, 0.1);

fn pt(x: f32, y: f32) -> LinePoint {
    LinePoint { p: Point::new(Mm(x), Mm(y)), bezier: false }
}

fn fill_polygon(ops: &mut Vec<Op>, points: Vec<LinePoint>, color: (f32, f32, f32)) {
    ops.push(Op::SetFillColor { col: rgb(color.0, color.1, color.2) });
    ops.push(Op::DrawPolygon {
        polygon: Polygon { rings: vec![PolygonRing { points }], mode: PaintMode::Fill, winding_order: WindingOrder::NonZero },
    });
}

fn rect(ops: &mut Vec<Op>, x: f32, y: f32, w: f32, h: f32, color: (f32, f32, f32)) {
    fill_polygon(ops, vec![pt(x, y), pt(x + w, y), pt(x + w, y + h), pt(x, y + h)], color);
}

/// Five-pointed star; the font has no star glyph.
fn star(ops: &mut Vec<Op>, cx: f32, cy: f32, r: f32, filled: bool) {
    let points = (0..10)
        .map(|i| {
            let angle = std::f32::consts::PI / 2.0 + i as f32 * std::f32::consts::PI / 5.0;
            let radius = if i % 2 == 0 { r } else { r * 0.45 };
            pt(cx + radius * angle.cos(), cy + radius * angle.sin())
        })
        .collect();
    fill_polygon(ops, points, if filled { GOLD } else { (0.85, 0.86, 0.9) });
}

fn text(ops: &mut Vec<Op>, font: &PdfFontHandle, s: &str, size: f32, x: f32, y: f32, color: (f32, f32, f32)) {
    ops.push(Op::StartTextSection);
    ops.push(Op::SetFillColor { col: rgb(color.0, color.1, color.2) });
    ops.push(Op::SetFont { size: Pt(size), font: font.clone() });
    ops.push(Op::SetTextMatrix { matrix: TextMatrix::Translate(Mm(x).into(), Mm(y).into()) });
    ops.push(Op::ShowText { items: vec![TextItem::Text(s.to_string())] });
    ops.push(Op::EndTextSection);
}

fn draw_map(ops: &mut Vec<Op>, map: &CertMap, x: f32, y: f32, w: f32, h: f32) {
    let rows = map.rows.len().max(1) as f32;
    let cols = map.rows.first().map(|r| r.chars().count()).unwrap_or(1).max(1) as f32;
    let cell = (w / cols).min(h / rows);
    let top = y + h;
    for (ry, row) in map.rows.iter().enumerate() {
        for (cx, ch) in row.chars().enumerate() {
            let color = match ch {
                'B' => (0.45, 0.5, 0.58),
                'P' => (0.2, 0.7, 0.45),
                _ => (0.9, 0.94, 0.98),
            };
            rect(ops, x + cx as f32 * cell + 0.4, top - (ry as f32 + 1.0) * cell + 0.4, cell - 0.8, cell - 0.8, color);
        }
    }
    let points: Vec<LinePoint> = map
        .path
        .iter()
        .filter_map(|key| {
            let (px, py) = key.split_once(',')?;
            let (px, py) = (px.parse::<f32>().ok()?, py.parse::<f32>().ok()?);
            Some(pt(x + (px + 0.5) * cell, top - (py + 0.5) * cell))
        })
        .collect();
    if points.len() > 1 {
        ops.push(Op::SetOutlineColor { col: rgb(DRONE.0, DRONE.1, DRONE.2) });
        ops.push(Op::SetOutlineThickness { pt: Pt(3.0) });
        ops.push(Op::DrawLine { line: Line { points, is_closed: false } });
    }
}

/// A4 certificate with the pilot's name, stars, solved missions and the last flight path.
pub fn build_pdf(data: &CertificateData) -> AppResult<Vec<u8>> {
    let mut doc = PdfDocument::new("CodingLab Zertifikat");
    let mut font_warnings = Vec::new();
    let parsed = ParsedFont::from_bytes(FONT, 0, &mut font_warnings)
        .ok_or_else(|| AppError::Other("Schrift für das Zertifikat fehlt.".into()))?;
    let font = PdfFontHandle::External(doc.add_font(&parsed));
    let mut ops = Vec::new();

    rect(&mut ops, 0.0, 257.0, 210.0, 40.0, HTL);
    text(&mut ops, &font, "HTL Villach · CodingLab", 14.0, 20.0, 282.0, (1.0, 1.0, 1.0));
    text(&mut ops, &font, "Zertifikat", 34.0, 20.0, 266.0, (1.0, 1.0, 1.0));

    text(&mut ops, &font, "Pilot-Ausweis für", 16.0, 20.0, 236.0, MUTED);
    let name: String = data.pilot_name.chars().take(24).collect();
    text(&mut ops, &font, &name, 40.0, 20.0, 218.0, INK);
    text(
        &mut ops,
        &font,
        &format!("hat {} von {} Sternen gesammelt.", data.total_stars, data.max_stars),
        18.0,
        20.0,
        204.0,
        INK,
    );

    let mut y = 186.0;
    for m in data.missions.iter().take(7) {
        text(&mut ops, &font, &format!("{}  {}", m.id, m.title), 14.0, 20.0, y, INK);
        for i in 0..3 {
            star(&mut ops, 110.0 + i as f32 * 8.0, y + 1.8, 3.2, i < m.stars);
        }
        y -= 10.0;
    }

    if let Some(map) = &data.map {
        text(&mut ops, &font, "Dein letzter Flug", 14.0, 140.0, 186.0, MUTED);
        draw_map(&mut ops, map, 140.0, 118.0, 50.0, 62.0);
    }

    rect(&mut ops, 20.0, 60.0, 170.0, 0.6, (0.85, 0.86, 0.9));
    text(&mut ops, &font, &format!("Villach, {}", data.date), 12.0, 20.0, 50.0, MUTED);
    text(&mut ops, &font, "Mehr über die HTL Villach:", 12.0, 20.0, 36.0, MUTED);
    text(&mut ops, &font, &data.qr_url, 14.0, 20.0, 28.0, HTL);

    doc.with_pages(vec![PdfPage::new(Mm(210.0), Mm(297.0), ops)]);
    let mut warnings = Vec::new();
    Ok(doc.save(&PdfSaveOptions::default(), &mut warnings))
}

#[cfg(test)]
mod tests {
    use super::*;

    pub fn sample() -> CertificateData {
        CertificateData {
            pilot_name: "Jürgen-Maß".into(),
            total_stars: 8,
            max_stars: 21,
            missions: vec![
                CertMission { id: "1.1".into(), title: "Erster Flug".into(), stars: 3 },
                CertMission { id: "2.1".into(), title: "Runde drehen".into(), stars: 2 },
                CertMission { id: "3.1".into(), title: "Nebel".into(), stars: 3 },
            ],
            date: "10.10.2026".into(),
            qr_url: "https://www.htl-villach.at".into(),
            map: Some(CertMap {
                rows: vec![".....".into(), ".C.C.".into(), "..B..".into(), ".P.C.".into(), ".....".into()],
                path: vec!["1,3".into(), "1,2".into(), "1,1".into(), "2,1".into(), "3,1".into(), "3,2".into(), "3,3".into(), "2,3".into()],
            }),
        }
    }

    #[test]
    fn builds_a_pdf() {
        let pdf = build_pdf(&sample()).unwrap();
        assert!(pdf.starts_with(b"%PDF"));
        assert!(pdf.len() < 2_000_000);
    }

    #[test]
    fn works_without_map_and_missions() {
        let mut data = sample();
        data.map = None;
        data.missions.clear();
        assert!(build_pdf(&data).unwrap().starts_with(b"%PDF"));
    }

    #[test]
    #[ignore = "writes a PDF for visual inspection: cargo test -- --ignored"]
    fn writes_sample_for_inspection() {
        let out = std::env::temp_dir().join("codinglab-certificate.pdf");
        std::fs::write(&out, build_pdf(&sample()).unwrap()).unwrap();
        println!("{}", out.display());
    }
}
