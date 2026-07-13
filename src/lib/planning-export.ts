import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import type { PlanningClient, Temperature } from "@/pages/SalesPlanning";

const fmtBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

const tempLabel = (t: Temperature) => (t === "hot" ? "Quente" : "Morno");

const sortClients = (list: PlanningClient[]) => {
  const order: Record<Temperature, number> = { hot: 0, warm: 1 };
  return [...list].sort((a, b) => {
    const t = order[a.temperature] - order[b.temperature];
    if (t !== 0) return t;
    if (b.value !== a.value) return b.value - a.value;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
};

const todayStamp = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export interface ExportPayload {
  sellers: { id: string; name: string }[];
  clients: PlanningClient[];
  hotSum: number;
  warmSum: number;
  currentRevenue: number;
  filterLabel: string; // "Todos" or "Fulano, Ciclano"
}

export function exportPlanningToPdf(data: ExportPayload) {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 32;
  const marginTop = 40;
  let y = marginTop;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Planejamento de Vendas", marginX, y);
  y += 16;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(110);
  doc.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, marginX, y);
  y += 11;
  doc.text(`Vendedores: ${data.filterLabel}`, marginX, y);
  y += 14;
  doc.setTextColor(0);

  const tableTop = y;

  // Layout: one column per seller, side by side
  const sellers = data.sellers;
  const maxColsPerPage = 5;
  const pages: typeof sellers[] = [];
  for (let i = 0; i < sellers.length; i += maxColsPerPage) {
    pages.push(sellers.slice(i, i + maxColsPerPage));
  }
  if (pages.length === 0) pages.push([]);

  pages.forEach((pageSellers, pageIdx) => {
    if (pageIdx > 0) {
      doc.addPage();
    }
    const startY = pageIdx === 0 ? tableTop : marginTop;
    const availableW = pageWidth - marginX * 2;
    const gap = 8;
    const colCount = Math.max(pageSellers.length, 1);
    const colWidth = (availableW - gap * (colCount - 1)) / colCount;

    let maxBottom = startY;

    pageSellers.forEach((seller, idx) => {
      const list = sortClients(data.clients.filter((c) => c.seller_id === seller.id));
      const subtotal = list.reduce((a, c) => a + (Number(c.value) || 0), 0);
      const x = marginX + idx * (colWidth + gap);

      // Header block
      doc.setFillColor(30, 41, 59);
      doc.rect(x, startY, colWidth, 32, "F");
      doc.setTextColor(255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text(seller.name, x + 6, startY + 13, { maxWidth: colWidth - 12 });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(
        `${list.length} ${list.length === 1 ? "cliente" : "clientes"} • ${fmtBRL(subtotal)}`,
        x + 6,
        startY + 26,
        { maxWidth: colWidth - 12 },
      );
      doc.setTextColor(0);

      const body = list.map((c) => [
        c.name,
        tempLabel(c.temperature),
        fmtBRL(Number(c.value) || 0),
      ]);

      autoTable(doc, {
        startY: startY + 32,
        margin: { left: x, right: pageWidth - x - colWidth },
        tableWidth: colWidth,
        head: [["Cliente", "Temp.", "Valor"]],
        body: body.length ? body : [["Sem clientes", "", ""]],
        styles: { fontSize: 8, cellPadding: 3, overflow: "linebreak" },
        headStyles: { fillColor: [51, 65, 85], textColor: 255, fontSize: 8 },
        columnStyles: {
          0: { cellWidth: colWidth - 90 },
          1: { cellWidth: 42 },
          2: { cellWidth: 48, halign: "right" },
        },
        didParseCell: (hook) => {
          if (hook.section === "body" && hook.column.index === 1) {
            if (hook.cell.raw === "Quente") hook.cell.styles.textColor = [220, 38, 38];
            else if (hook.cell.raw === "Morno") hook.cell.styles.textColor = [217, 119, 6];
            else hook.cell.styles.textColor = [140, 140, 140];
          }
        },
      });

      // @ts-expect-error autoTable adds lastAutoTable
      const finalY = doc.lastAutoTable.finalY as number;
      if (finalY > maxBottom) maxBottom = finalY;
    });

    y = maxBottom;
  });

  // Totals table on new page
  doc.addPage();
  const total = data.hotSum + data.warmSum + data.currentRevenue;
  autoTable(doc, {
    startY: marginTop,
    margin: { left: marginX, right: marginX },
    head: [["Índice", "Valor"]],
    body: [
      ["Faturamento Projetado — Quente", fmtBRL(data.hotSum)],
      ["Faturamento Projetado — Morno", fmtBRL(data.warmSum)],
      ["Faturamento atual da empresa", fmtBRL(data.currentRevenue)],
      ["Total", fmtBRL(total)],
    ],
    styles: { fontSize: 11, cellPadding: 6 },
    headStyles: { fillColor: [16, 185, 129], textColor: 255 },
    columnStyles: { 1: { halign: "right", cellWidth: 200 } },
    didParseCell: (hook) => {
      if (hook.section === "body" && hook.row.index === 3) {
        hook.cell.styles.fontStyle = "bold";
        hook.cell.styles.fillColor = [240, 253, 244];
      }
    },
  });

  const total_pages = doc.getNumberOfPages();
  for (let i = 1; i <= total_pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(140);
    doc.text(`Página ${i} de ${total_pages}`, pageWidth - marginX, pageHeight - 20, {
      align: "right",
    });
  }

  doc.save(`planejamento-${todayStamp()}.pdf`);
}

export function exportPlanningToXlsx(data: ExportPayload) {
  const wb = XLSX.utils.book_new();
  const total = data.hotSum + data.warmSum + data.currentRevenue;

  // Resumo sheet
  const resumoRows: (string | number)[][] = [
    ["Planejamento de Vendas"],
    [`Gerado em: ${new Date().toLocaleString("pt-BR")}`],
    [`Vendedores: ${data.filterLabel}`],
    [],
    ["Índice", "Valor"],
    ["Faturamento Projetado — Quente", data.hotSum],
    ["Faturamento Projetado — Morno", data.warmSum],
    ["Faturamento atual da empresa", data.currentRevenue],
    ["Total", total],
    [],
    ["Vendedor", "Clientes", "Subtotal"],
  ];

  for (const s of data.sellers) {
    const list = data.clients.filter((c) => c.seller_id === s.id);
    const subtotal = list.reduce((a, c) => a + (Number(c.value) || 0), 0);
    resumoRows.push([s.name, list.length, subtotal]);
  }

  const wsResumo = XLSX.utils.aoa_to_sheet(resumoRows);
  wsResumo["!cols"] = [{ wch: 36 }, { wch: 18 }, { wch: 18 }];
  // Currency format on relevant cells
  const currencyFmt = 'R$ #,##0.00;[Red]-R$ #,##0.00';
  ["B6", "B7", "B8", "B9"].forEach((addr) => {
    if (wsResumo[addr]) wsResumo[addr].z = currencyFmt;
  });
  for (let r = 11; r < resumoRows.length; r++) {
    const addr = XLSX.utils.encode_cell({ r, c: 2 });
    if (wsResumo[addr]) wsResumo[addr].z = currencyFmt;
  }
  XLSX.utils.book_append_sheet(wb, wsResumo, "Resumo");

  // Clientes sheet
  const clientRows: (string | number)[][] = [["Vendedor", "Cliente", "Temperatura", "Valor"]];
  for (const s of data.sellers) {
    const list = sortClients(data.clients.filter((c) => c.seller_id === s.id));
    for (const c of list) {
      clientRows.push([s.name, c.name, tempLabel(c.temperature), Number(c.value) || 0]);
    }
  }
  const wsClientes = XLSX.utils.aoa_to_sheet(clientRows);
  wsClientes["!cols"] = [{ wch: 24 }, { wch: 30 }, { wch: 14 }, { wch: 16 }];
  for (let r = 1; r < clientRows.length; r++) {
    const addr = XLSX.utils.encode_cell({ r, c: 3 });
    if (wsClientes[addr]) wsClientes[addr].z = currencyFmt;
  }
  XLSX.utils.book_append_sheet(wb, wsClientes, "Clientes");

  XLSX.writeFile(wb, `planejamento-${todayStamp()}.xlsx`);
}
