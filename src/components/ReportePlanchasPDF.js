import React from 'react';
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 30, fontFamily: 'Helvetica', fontSize: 10, color: '#333', backgroundColor: '#f8fafc' },
  header: {
    marginBottom: 20, borderBottomWidth: 2, borderBottomColor: '#2563EB', paddingBottom: 10,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'
  },
  title: { fontSize: 16, fontWeight: 'bold', color: '#1e3a8a', textTransform: 'uppercase' },
  subTitle: { fontSize: 9, color: '#666' },
  
  statsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  statBox: { width: '23%', backgroundColor: '#ffffff', padding: 10, borderRadius: 6, textAlign: 'center', border: '1px solid #e2e8f0', borderTop: '4px solid #3b82f6' },
  statBoxWin: { width: '23%', backgroundColor: '#ffffff', padding: 10, borderRadius: 6, textAlign: 'center', border: '1px solid #22c55e', borderTop: '4px solid #22c55e' },
  statLabel: { fontSize: 7, color: '#64748b', textTransform: 'uppercase', marginBottom: 4, fontWeight: 'bold' },
  statValue: { fontSize: 16, fontWeight: 'bold', color: '#0f172a' },

  sectionContainer: { backgroundColor: '#ffffff', padding: 15, borderRadius: 6, border: '1px solid #e2e8f0', marginBottom: 20 },
  sectionTitle: { fontSize: 11, fontWeight: 'bold', marginBottom: 15, color: '#1e293b', textTransform: 'uppercase' },

  barContainer: { marginBottom: 12 },
  barHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  barLabel: { fontSize: 9, fontWeight: 'bold', color: '#334155' },
  barValues: { fontSize: 9, color: '#64748b' },
  barBackground: { width: '100%', height: 12, backgroundColor: '#f1f5f9', borderRadius: 6, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 6 },

  table: { display: 'table', width: '100%', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 4, overflow: 'hidden' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', minHeight: 22, alignItems: 'center' },
  tableHeader: { backgroundColor: '#f8fafc' },
  tableCol: { padding: 6, borderRightWidth: 1, borderRightColor: '#e2e8f0' },
  lastCol: { borderRightWidth: 0 },
  headerText: { fontSize: 8, fontWeight: 'bold', color: '#475569', textTransform: 'uppercase' },
  cellText: { fontSize: 9, color: '#334155' },

  wPlancha: { width: '30%' },
  wVotos: { width: '15%', textAlign: 'center' },
  wDirectos: { width: '15%', textAlign: 'center' },
  wResiduo: { width: '15%', textAlign: 'center' },
  wExtra: { width: '10%', textAlign: 'center' },
  wTotal: { width: '15%', textAlign: 'center', backgroundColor: '#f0fdf4' },

  // AUDITORIA ANCHOS
  wAudUser: { width: '30%' },
  wAudEmp: { width: '35%' },
  wAudVoto: { width: '20%', textAlign: 'center' },
  wAudCoef: { width: '15%', textAlign: 'right' },

  footer: { position: 'absolute', bottom: 20, left: 30, right: 30, textAlign: 'center', fontSize: 8, color: '#94a3b8', borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 10 }
});

const ReportePlanchasPDF = ({ item }) => {
  const fechaReporte = new Date().toLocaleDateString('es-CO');
  const horaReporte = new Date().toLocaleTimeString('es-CO');
  
  if (!item || item.tipo !== 'planchas' || !item.planchas_data) {
      return <Document><Page><Text>Datos no válidos para reporte de planchas.</Text></Page></Document>;
  }

  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#6366f1', '#14b8a6'];

  let maxCargos = -1;
  let ganadores = [];
  let maxVotos = 0;

  Object.entries(item.planchas_data).forEach(([op, data]) => {
      if (data.total_cargos > maxCargos) { maxCargos = data.total_cargos; ganadores = [op]; } 
      else if (data.total_cargos === maxCargos) { ganadores.push(op); }
      
      const votos = item.resultados[op] || 0;
      if (votos > maxVotos) maxVotos = votos;
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        
        <View style={styles.header} fixed>
          <View>
            <Text style={styles.title}>Dashboard Electoral</Text>
            <Text style={styles.subTitle}>Evento Virtual Andesco</Text>
          </View>
          <View style={{alignItems: 'flex-end'}}>
             <Text style={styles.subTitle}>{fechaReporte}</Text>
             <Text style={styles.subTitle}>Votación #{item.id}</Text>
          </View>
        </View>

        <Text style={{fontSize: 11, fontWeight: 'bold', color: '#0f172a', marginBottom: 15}}>{item.pregunta}</Text>

        <View style={styles.statsContainer}>
            <View style={styles.statBox}>
                <Text style={styles.statLabel}>Total Votos</Text>
                <Text style={styles.statValue}>{item.total.toFixed(2)}</Text>
            </View>
            <View style={styles.statBox}>
                <Text style={styles.statLabel}>Cargos a Proveer</Text>
                <Text style={styles.statValue}>{item.cargos}</Text>
            </View>
            <View style={styles.statBox}>
                <Text style={styles.statLabel}>Cociente Electoral</Text>
                <Text style={{...styles.statValue, color: '#4f46e5'}}>{item.cociente?.toFixed(2)}</Text>
            </View>
            <View style={styles.statBoxWin}>
                <Text style={{...styles.statLabel, color: '#15803d'}}>Ganador (Más Cargos)</Text>
                <Text style={{...styles.statValue, color: '#166534', fontSize: ganadores.length > 1 ? 10 : 14}}>{ganadores.join(' / ')}</Text>
            </View>
        </View>

        <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Comparativa de Votos vs Cargos</Text>
            {Object.entries(item.planchas_data).map(([op, data], index) => {
                const votos = item.resultados[op] || 0;
                const widthPct = maxVotos > 0 ? (votos / maxVotos) * 100 : 0;
                const color = colors[index % colors.length];
                
                return (
                    <View key={op} style={styles.barContainer} wrap={false}>
                        <View style={styles.barHeader}>
                            <Text style={styles.barLabel}>{op}</Text>
                            <Text style={styles.barValues}>{votos.toFixed(2)} votos | {data.total_cargos} cargos</Text>
                        </View>
                        <View style={styles.barBackground}>
                            <View style={[styles.barFill, { width: `${widthPct}%`, backgroundColor: color }]}></View>
                        </View>
                    </View>
                );
            })}
        </View>

        <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Desglose Matemático (Mayores Restos)</Text>
            <View style={styles.table}>
                <View style={[styles.tableRow, styles.tableHeader]} fixed>
                    <View style={[styles.tableCol, styles.wPlancha]}><Text style={styles.headerText}>Plancha</Text></View>
                    <View style={[styles.tableCol, styles.wVotos]}><Text style={styles.headerText}>Votos</Text></View>
                    <View style={[styles.tableCol, styles.wDirectos]}><Text style={styles.headerText}>Directos</Text></View>
                    <View style={[styles.tableCol, styles.wResiduo]}><Text style={styles.headerText}>Residuo</Text></View>
                    <View style={[styles.tableCol, styles.wExtra]}><Text style={styles.headerText}>Extra</Text></View>
                    <View style={[styles.tableCol, styles.wTotal, styles.lastCol]}><Text style={styles.headerText}>Total</Text></View>
                </View>

                {Object.entries(item.planchas_data).map(([op, pData], i) => {
                    const votos = item.resultados[op] || 0;
                    return (
                        <View key={i} style={styles.tableRow} wrap={false}>
                            <View style={[styles.tableCol, styles.wPlancha]}><Text style={[styles.cellText, {fontWeight:'bold'}]}>{op}</Text></View>
                            <View style={[styles.tableCol, styles.wVotos]}><Text style={styles.cellText}>{votos.toFixed(2)}</Text></View>
                            <View style={[styles.tableCol, styles.wDirectos]}><Text style={styles.cellText}>{pData.directos}</Text></View>
                            <View style={[styles.tableCol, styles.wResiduo]}><Text style={styles.cellText}>{pData.residuo.toFixed(4)}</Text></View>
                            <View style={[styles.tableCol, styles.wExtra]}><Text style={[styles.cellText, {color: '#4f46e5'}]}>+{pData.restos}</Text></View>
                            <View style={[styles.tableCol, styles.wTotal, styles.lastCol]}><Text style={[styles.cellText, {fontWeight: 'bold', color: '#15803d'}]}>{pData.total_cargos}</Text></View>
                        </View>
                    );
                })}
            </View>
        </View>

        {/* NUEVO: TABLA AUDITORÍA COMPLETA DENTRO DEL REPORTE DE PLANCHAS */}
        {item.detalles && item.detalles.length > 0 && (
            <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>Auditoría Individual de Votos</Text>
                <View style={styles.table}>
                    <View style={[styles.tableRow, styles.tableHeader]} fixed>
                        <View style={[styles.tableCol, styles.wAudUser]}><Text style={styles.headerText}>Usuario / Representante</Text></View>
                        <View style={[styles.tableCol, styles.wAudEmp]}><Text style={styles.headerText}>Empresa</Text></View>
                        <View style={[styles.tableCol, styles.wAudVoto]}><Text style={styles.headerText}>Voto</Text></View>
                        <View style={[styles.tableCol, styles.wAudCoef, styles.lastCol]}><Text style={styles.headerText}>Coef.</Text></View>
                    </View>
                    {item.detalles.map((d, i) => (
                        <View key={i} style={styles.tableRow} wrap={false}>
                            <View style={[styles.tableCol, styles.wAudUser]}>
                                <Text style={styles.cellText}>{d.nombre || 'Anonimo'}</Text>
                                {d.representados ? <Text style={{fontSize: 7, color: '#d97706', marginTop: 2}}>Poder: {d.representados}</Text> : null}
                            </View>
                            <View style={[styles.tableCol, styles.wAudEmp]}><Text style={styles.cellText}>{d.nombre_empresa || '-'}</Text></View>
                            <View style={[styles.tableCol, styles.wAudVoto]}><Text style={styles.cellText}>{d.respuesta}</Text></View>
                            <View style={[styles.tableCol, styles.wAudCoef, styles.lastCol]}><Text style={styles.cellText}>{parseFloat(d.coeficiente).toFixed(2)}</Text></View>
                        </View>
                    ))}
                </View>
            </View>
        )}

        <Text style={styles.footer} fixed render={({ pageNumber, totalPages }) => (
          `Página ${pageNumber} de ${totalPages} - Sistema de Votación Acotur`
        )} />
      </Page>
    </Document>
  );
};

export default ReportePlanchasPDF;