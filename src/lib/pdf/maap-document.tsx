/**
 * react-pdf document for Maap exports. Dynamically imported so the heavy
 * renderer stays out of the main bundle (see export-dialog.tsx).
 *
 * Uses the built-in Helvetica family - no network font fetch, so generation
 * works offline. Helvetica lacks the rupee and prime glyphs, so currency is
 * "Rs." and dimensions use in/ft labels (design.md §9.3: minimal, photocopier-
 * friendly). One amber accent on the grand total, everything else ink-on-white.
 */
import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";
import { patiaCFT, pawaCFT } from "@/lib/calc";
import type { ProjectSummary, BucketResult } from "@/lib/types";
import type { PatiaEntry, PawaEntry } from "@/lib/db/entries";
import { formatDate } from "@/lib/format";

const INK = "#1C1917";
const MUTED = "#57534E";
const FAINT = "#A8A29E";
const LINE = "#D6D3D1";

const rs = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
const money = (n: number) => `Rs. ${rs.format(Math.round(n))}`;
const cft = (n: number) => n.toFixed(2);

export interface BillProfile {
  business_name: string;
  business_address: string | null;
  business_phone: string | null;
  logo_url: string | null;
}
export interface BillProject {
  name: string;
  client_name: string | null;
  client_address: string | null;
  project_date: string;
}
export interface ExportOptions {
  bill: boolean;
  patia: boolean;
  pawa: boolean;
}
export interface ExportDimensions {
  patia_widths_in: number[];
  patia_thicknesses_in: number[];
  pawa_lengths_in: number[];
  pawa_sizes: number[];
}
export interface MaapDocumentData {
  profile: BillProfile | null;
  project: BillProject;
  summary: ProjectSummary;
  patiaEntries: PatiaEntry[];
  pawaEntries: PawaEntry[];
  dimensions: ExportDimensions;
  options: ExportOptions;
}

const s = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 48,
    paddingHorizontal: 44,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: INK,
  },
  // Header
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  logo: { width: 56, height: 56, objectFit: "contain", marginRight: 12 },
  bizName: { fontFamily: "Helvetica-Bold", fontSize: 16, color: INK },
  bizLine: { fontSize: 9, color: MUTED, marginTop: 2 },
  rule: { borderBottomWidth: 1, borderBottomColor: LINE, marginVertical: 16 },
  docTitle: { fontFamily: "Helvetica-Bold", fontSize: 18, letterSpacing: 0.5 },
  // Parties
  parties: { flexDirection: "row", justifyContent: "space-between", marginTop: 14 },
  label: { fontSize: 8, color: FAINT, marginBottom: 3, textTransform: "uppercase" },
  partyName: { fontSize: 11, color: INK },
  partyLine: { fontSize: 9, color: MUTED, marginTop: 2 },
  metaRight: { alignItems: "flex-end" },
  // Bill header right side
  quoteTitle: { fontFamily: "Helvetica-Bold", fontSize: 22, letterSpacing: 1.5, color: INK },
  quoteDate: { fontSize: 9, color: MUTED, marginTop: 5 },
  // Table
  table: { marginTop: 24 },
  tHead: {
    flexDirection: "row",
    backgroundColor: "#F5F5F4",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: LINE,
  },
  tRow: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#E7E5E4" },
  th: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    color: MUTED,
    textTransform: "uppercase",
    letterSpacing: 0.3,
    paddingVertical: 7,
    paddingHorizontal: 8,
  },
  td: { fontSize: 10, paddingVertical: 8, paddingHorizontal: 8 },
  num: { textAlign: "right" },
  itemCol: { flex: 3.2 },
  cftCol: { flex: 1 },
  rateCol: { flex: 1.4 },
  amtCol: { flex: 1.6 },
  // Totals block (right-aligned, accounting style)
  totalsWrap: { flexDirection: "row", justifyContent: "flex-end", marginTop: 16 },
  totalsBox: { width: "52%" },
  totLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: "#E7E5E4",
  },
  totLabel: { fontSize: 10, color: MUTED },
  totVal: { fontSize: 10, color: INK, fontFamily: "Helvetica-Bold" },
  grandBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    backgroundColor: "#FEF3C7",
    borderRadius: 4,
    paddingVertical: 9,
    paddingHorizontal: 11,
  },
  grandLbl: { fontFamily: "Helvetica-Bold", fontSize: 11, color: "#7C2D12" },
  grandAmt: { fontFamily: "Helvetica-Bold", fontSize: 16, color: "#7C2D12" },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 44,
    right: 44,
    fontSize: 8,
    color: FAINT,
    textAlign: "center",
  },
  sectionTitle: { fontFamily: "Helvetica-Bold", fontSize: 13, marginBottom: 2 },
  sectionSub: { fontSize: 9, color: MUTED, marginBottom: 12 },
  // Reference mini-grids (mirrors the data-entry Width x Thickness matrix).
  grids: { flexDirection: "row", flexWrap: "wrap", marginTop: 4 },
  grid: { borderWidth: 1, borderColor: LINE, marginBottom: 12 },
  gTitle: {
    backgroundColor: "#F5F5F4",
    textAlign: "center",
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    paddingVertical: 3,
    borderBottomWidth: 1,
    borderBottomColor: LINE,
  },
  gHeadRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: LINE },
  gRow: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#EEEDEB" },
  gHcell: {
    fontFamily: "Helvetica-Bold",
    fontSize: 7,
    color: MUTED,
    textAlign: "center",
    paddingVertical: 3,
  },
  gRowHead: {
    fontSize: 7,
    color: MUTED,
    textAlign: "center",
    paddingVertical: 3,
    backgroundColor: "#FAFAF9",
  },
  gCell: { fontSize: 8, color: INK, textAlign: "center", paddingVertical: 3 },
  gBorder: { borderRightWidth: 0.5, borderRightColor: "#EEEDEB" },
});

function Header({ profile }: { profile: BillProfile | null }) {
  return (
    <View style={s.headerRow}>
      <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
        {profile?.logo_url ? (
          // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no alt
          <Image src={profile.logo_url} style={s.logo} />
        ) : null}
        <View>
          <Text style={s.bizName}>{profile?.business_name?.trim() || "—"}</Text>
          {profile?.business_address?.trim() ? (
            <Text style={s.bizLine}>{profile.business_address.trim()}</Text>
          ) : null}
          {profile?.business_phone?.trim() ? (
            <Text style={s.bizLine}>Phone: {profile.business_phone.trim()}</Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

/** Bill line items (only buckets with measured volume). */
const BILL_ROWS: { key: keyof ProjectSummary; label: string }[] = [
  { key: "frame_3_4", label: 'Frame 3" & 4"' },
  { key: "patia_1_5_to_4", label: "Patia 1.5' to 4'" },
  { key: "patia_4_5_to_5", label: "Patia 4.5' to 5'" },
  { key: "patia_5_5_to_up", label: "Patia 5.5' and up" },
  { key: "pawa", label: "Pawa" },
];

function BillPage({
  profile,
  project,
  summary,
}: {
  profile: BillProfile | null;
  project: BillProject;
  summary: ProjectSummary;
}) {
  const rows = BILL_ROWS.map((r) => ({
    label: r.label,
    bucket: summary[r.key] as BucketResult,
  })).filter((r) => r.bucket.cft > 0);

  return (
    <Page size="A4" style={s.page}>
      {/* Header: business block left, QUOTATION + date right */}
      <View style={s.headerRow}>
        <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
          {profile?.logo_url ? (
            // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no alt
            <Image src={profile.logo_url} style={s.logo} />
          ) : null}
          <View>
            <Text style={s.bizName}>{profile?.business_name?.trim() || "—"}</Text>
            {profile?.business_address?.trim() ? (
              <Text style={s.bizLine}>{profile.business_address.trim()}</Text>
            ) : null}
            {profile?.business_phone?.trim() ? (
              <Text style={s.bizLine}>Phone: {profile.business_phone.trim()}</Text>
            ) : null}
          </View>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={s.quoteTitle}>QUOTATION</Text>
          <Text style={s.quoteDate}>{formatDate(project.project_date)}</Text>
        </View>
      </View>

      <View style={s.rule} />

      {/* Bill to */}
      <View>
        <Text style={s.label}>Bill to</Text>
        <Text style={s.partyName}>
          {project.client_name?.trim() || project.name}
        </Text>
        {project.client_address?.trim() ? (
          <Text style={s.partyLine}>{project.client_address.trim()}</Text>
        ) : null}
      </View>

      {/* Items */}
      <View style={s.table}>
        <View style={s.tHead}>
          <Text style={[s.th, s.itemCol]}>Item</Text>
          <Text style={[s.th, s.num, s.cftCol]}>CFT</Text>
          <Text style={[s.th, s.num, s.rateCol]}>Rate / CFT</Text>
          <Text style={[s.th, s.num, s.amtCol]}>Amount</Text>
        </View>
        {rows.map((r) => (
          <View style={s.tRow} key={r.label}>
            <Text style={[s.td, s.itemCol]}>{r.label}</Text>
            <Text style={[s.td, s.num, s.cftCol]}>{cft(r.bucket.cft)}</Text>
            <Text style={[s.td, s.num, s.rateCol]}>{money(r.bucket.rate)}</Text>
            <Text style={[s.td, s.num, s.amtCol]}>{money(r.bucket.total)}</Text>
          </View>
        ))}
      </View>

      {/* Totals, right-aligned */}
      <View style={s.totalsWrap}>
        <View style={s.totalsBox}>
          <View style={s.totLine}>
            <Text style={s.totLabel}>Total volume</Text>
            <Text style={s.totVal}>{cft(summary.totalCFT)} CFT</Text>
          </View>
          <View style={s.grandBox}>
            <Text style={s.grandLbl}>Total</Text>
            <Text style={s.grandAmt}>{money(summary.grandTotal)}</Text>
          </View>
        </View>
      </View>

      <Text style={s.footer}>
        Thank you for your business. • Generated by Maap •{" "}
        {formatDate(project.project_date)}
      </Text>
    </Page>
  );
}

/**
 * A compact Width/Thickness (or Length/Size) matrix, mirroring the data-entry
 * grid the user knows from Excel. Cells are blank when zero so the filled
 * numbers stand out and the buyer can scan a familiar layout.
 */
function MiniGrid({
  title,
  rowHeaders,
  colHeaders,
  colLabel,
  valueAt,
  cornerLabel,
  width,
  marginRight,
}: {
  title: string;
  rowHeaders: number[];
  colHeaders: number[];
  colLabel: (v: number) => string;
  valueAt: (row: number, col: number) => number;
  cornerLabel: string;
  width: string;
  marginRight?: number | string;
}) {
  const last = colHeaders.length - 1;
  return (
    <View style={[s.grid, { width, marginRight }]} wrap={false}>
      <Text style={s.gTitle}>{title}</Text>
      <View style={s.gHeadRow}>
        <Text style={[s.gHcell, s.gBorder, { flex: 1 }]}>{cornerLabel}</Text>
        {colHeaders.map((c, i) => (
          <Text key={c} style={[s.gHcell, i < last ? s.gBorder : {}, { flex: 1 }]}>
            {colLabel(c)}
          </Text>
        ))}
      </View>
      {rowHeaders.map((r) => (
        <View key={r} style={s.gRow}>
          <Text style={[s.gRowHead, s.gBorder, { flex: 1 }]}>{r}</Text>
          {colHeaders.map((c, i) => {
            const v = valueAt(r, c);
            return (
              <Text key={c} style={[s.gCell, i < last ? s.gBorder : {}, { flex: 1 }]}>
                {v > 0 ? String(v) : ""}
              </Text>
            );
          })}
        </View>
      ))}
    </View>
  );
}

function PatiaReferencePage({
  profile,
  project,
  entries,
  dimensions,
}: {
  profile: BillProfile | null;
  project: BillProject;
  entries: PatiaEntry[];
  dimensions: ExportDimensions;
}) {
  const filled = entries.filter((e) => e.quantity > 0);
  const byCell = new Map<string, number>();
  for (const e of filled)
    byCell.set(`${e.length_ft}|${e.width_in}|${e.thickness_in}`, e.quantity);

  // Only show lengths that actually have entries, ascending.
  const lengths = Array.from(new Set(filled.map((e) => e.length_ft))).sort(
    (a, b) => a - b,
  );
  const totalCFT = filled.reduce((sum, e) => sum + patiaCFT(e), 0);
  const totalPieces = filled.reduce((n, e) => n + e.quantity, 0);

  return (
    <Page size="A4" style={s.page}>
      <Header profile={profile} />
      <View style={s.rule} />
      <Text style={s.sectionTitle}>Patia details</Text>
      <Text style={s.sectionSub}>
        {project.name} • {formatDate(project.project_date)} • reference for count
        verification
      </Text>
      <View style={s.grids}>
        {lengths.map((l, i) => (
          <MiniGrid
            key={l}
            title={`${l} Feet`}
            cornerLabel="in"
            rowHeaders={dimensions.patia_widths_in}
            colHeaders={dimensions.patia_thicknesses_in}
            colLabel={(t) => String(t)}
            valueAt={(w, t) => byCell.get(`${l}|${w}|${t}`) ?? 0}
            width="31.5%"
            marginRight={i % 3 === 2 ? 0 : "2.75%"}
          />
        ))}
      </View>
      <Text style={[s.sectionSub, { marginTop: 2 }]}>
        Total pieces: {totalPieces} • {cft(totalCFT)} CFT
      </Text>
      <Text style={s.footer}>Generated by Maap • {formatDate(project.project_date)}</Text>
    </Page>
  );
}

function PawaReferencePage({
  profile,
  project,
  entries,
  dimensions,
}: {
  profile: BillProfile | null;
  project: BillProject;
  entries: PawaEntry[];
  dimensions: ExportDimensions;
}) {
  const filled = entries.filter((e) => e.quantity > 0);
  const byCell = new Map<string, number>();
  for (const e of filled) byCell.set(`${e.length_in}|${e.size_side}`, e.quantity);
  const totalCFT = filled.reduce((sum, e) => sum + pawaCFT(e), 0);
  const totalPieces = filled.reduce((n, e) => n + e.quantity, 0);

  return (
    <Page size="A4" style={s.page}>
      <Header profile={profile} />
      <View style={s.rule} />
      <Text style={s.sectionTitle}>Pawa details</Text>
      <Text style={s.sectionSub}>
        {project.name} • {formatDate(project.project_date)} • reference for count
        verification
      </Text>
      <View style={s.grids}>
        <MiniGrid
          title="Pawa"
          cornerLabel="in"
          rowHeaders={dimensions.pawa_lengths_in}
          colHeaders={dimensions.pawa_sizes}
          colLabel={(z) => `${z}x${z}`}
          valueAt={(l, z) => byCell.get(`${l}|${z}`) ?? 0}
          width="44%"
        />
      </View>
      <Text style={[s.sectionSub, { marginTop: 2 }]}>
        Total pieces: {totalPieces} • {cft(totalCFT)} CFT
      </Text>
      <Text style={s.footer}>Generated by Maap • {formatDate(project.project_date)}</Text>
    </Page>
  );
}

/** Builds the export document with whichever sections were selected. */
export function MaapDocument({ data }: { data: MaapDocumentData }) {
  const { profile, project, summary, patiaEntries, pawaEntries, dimensions, options } =
    data;
  return (
    <Document title={project.name} author="Maap">
      {options.bill && (
        <BillPage profile={profile} project={project} summary={summary} />
      )}
      {options.patia && (
        <PatiaReferencePage
          profile={profile}
          project={project}
          entries={patiaEntries}
          dimensions={dimensions}
        />
      )}
      {options.pawa && (
        <PawaReferencePage
          profile={profile}
          project={project}
          entries={pawaEntries}
          dimensions={dimensions}
        />
      )}
    </Document>
  );
}
