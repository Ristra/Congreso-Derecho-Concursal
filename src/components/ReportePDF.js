import React from 'react';
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    paddingTop: 80, 
    paddingBottom: 40,
    paddingHorizontal: 30,
    backgroundColor: '#ffffff',
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#333',
  },
  headerContainer: {
    position: 'absolute',
    top: 30,
    left: 30,
    right: 30,
    height: 40,
    borderBottomWidth: 2,
    borderBottomColor: '#1e3a8a', 
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingBottom: 5,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e3a8a',
    textTransform: 'uppercase',
  },
  headerSub: {
    fontSize: 8,
    color: '#666',
  },
  
  sectionTitle: {
    marginTop: 20,
    marginBottom: 10,
    fontSize: 11,
    fontWeight: 'bold',
    backgroundColor: '#f3f4f6',
    padding: 6,
    borderLeftWidth: 4,
    borderLeftColor: '#1e3a8a',
  },
  metaDataContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 15,
    gap: 20,
    fontSize: 8,
    color: '#555',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 5,
  },
  
  table: {
    display: 'table',
    width: '100%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 20,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    minHeight: 16,
    alignItems: 'center',
  },
  tableHeader: {
    backgroundColor: '#eff6ff', 
    fontWeight: 'bold',
    color: '#1e3a8a',
  },
  cell: {
    padding: 4,
    fontSize: 8,
    borderRightWidth: 1,
    borderRightColor: '#e5e7eb',
  },
  lastCell: {
    borderRightWidth: 0,
  },
  
  wResOpt: { width: '60%' },
  wResVal: { width: '20%', textAlign: 'center' },
  wResPct: { width: '20%', textAlign: 'right' },

  wAudUser: { width: '30%' },
  wAudEmp: { width: '35%' },
  wAudVoto: { width: '20%', textAlign: 'center' },
  wAudCoef: { width: '15%', textAlign: 'right' },

  bold: { fontWeight: 'bold' },
  textRight: { textAlign: 'right' },
  
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 30,
    right: 30,
    textAlign: 'center',
    fontSize: 7,
    color: '#9ca3af',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 5,
  }
});

const ReportePDF = ({ historial }) => {
  const fechaReporte = new Date().toLocaleDateString('es-CO', { 
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' 
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        
        <View style={styles.headerContainer} fixed>
            <View>
                <Text style={styles.headerTitle}>Informe Oficial de Votación</Text>
                <Text style={styles.headerSub}>Evento Virtual RLA</Text>
            </View>
            <View>
                <Text style={styles.headerSub}>{fechaReporte}</Text>
            </View>
        </View>

        {historial.map((item, index) => {
           let maxVal = -1;
           let winner = '';
           if(item.resultados) {
               Object.entries(item.resultados).forEach(([op, val]) => {
                   if(val > maxVal) { maxVal = val; winner = op; }
               });
           }

           return (
            <View key={item.id}>
              <Text style={styles.sectionTitle}>
                 {index + 1}. {item.pregunta}
              </Text>
              
              <View style={styles.metaDataContainer}>
                 <Text>ID Votación: #{item.id}</Text>
                 <Text>Quórum Inicio: {parseFloat(item.quorum_inicio || 0).toFixed(2)}%</Text>
                 <Text>Quórum Cierre: {parseFloat(item.quorum_fin || 0).toFixed(2)}%</Text>
              </View>

              <View wrap={false}>
                  <Text style={{fontSize:9, marginBottom:4, fontWeight:'bold'}}>Resultados Consolidados:</Text>
                  <View style={styles.table}>
                      <View style={[styles.tableRow, styles.tableHeader]}>
                          <Text style={[styles.cell, styles.wResOpt, styles.bold]}>Opción</Text>
                          <Text style={[styles.cell, styles.wResVal, styles.bold]}>Votos (Coef)</Text>
                          <Text style={[styles.cell, styles.wResPct, styles.bold, styles.lastCell]}>% Total</Text>
                      </View>
                      {Object.entries(item.resultados || {}).map(([op, val]) => {
                          const pct = item.total > 0 ? (val / item.total) * 100 : 0;
                          const isWinner = op === winner && item.total > 0;
                          return (
                              <View key={op} style={styles.tableRow}>
                                  <Text style={[styles.cell, styles.wResOpt, isWinner ? styles.bold : {}]}>
                                      {op} {isWinner ? '(Ganador)' : ''}
                                  </Text>
                                  <Text style={[styles.cell, styles.wResVal]}>{val.toFixed(2)}</Text>
                                  <Text style={[styles.cell, styles.wResPct, styles.lastCell]}>{pct.toFixed(2)}%</Text>
                              </View>
                          );
                      })}
                      <View style={[styles.tableRow, {backgroundColor: '#f9fafb'}]}>
                          <Text style={[styles.cell, styles.wResOpt, styles.textRight, styles.bold]}>TOTAL REGISTRADO</Text>
                          <Text style={[styles.cell, styles.wResVal, styles.bold]}>{item.total.toFixed(2)}</Text>
                          <Text style={[styles.cell, styles.wResPct, styles.bold, styles.lastCell]}>100%</Text>
                      </View>
                  </View>
              </View>

              {item.detalles && item.detalles.length > 0 && (
                  <View>
                      <Text style={{fontSize:9, marginBottom:4, fontWeight:'bold', marginTop: 10}}>Auditoría Individual de Votos:</Text>
                      <View style={styles.table}>
                          <View style={[styles.tableRow, styles.tableHeader]}>
                              <Text style={[styles.cell, styles.wAudUser, styles.bold]}>Usuario / Representante</Text>
                              <Text style={[styles.cell, styles.wAudEmp, styles.bold]}>Empresa</Text>
                              <Text style={[styles.cell, styles.wAudVoto, styles.bold]}>Voto</Text>
                              <Text style={[styles.cell, styles.wAudCoef, styles.bold, styles.lastCell]}>Coef.</Text>
                          </View>
                          {item.detalles.map((d, i) => (
                              <View key={i} style={styles.tableRow}>
                                  {/* NUEVO: Muestra representados en PDF */}
                                  <View style={[styles.cell, styles.wAudUser]}>
                                      <Text>{d.nombre || 'Anonimo'}</Text>
                                      {d.representados ? <Text style={{fontSize: 7, color: '#d97706', marginTop: 2}}>Poder: {d.representados}</Text> : null}
                                  </View>
                                  <Text style={[styles.cell, styles.wAudEmp]}>{d.nombre_empresa || '-'}</Text>
                                  <Text style={[styles.cell, styles.wAudVoto]}>{d.respuesta}</Text>
                                  <Text style={[styles.cell, styles.wAudCoef, styles.lastCell]}>{parseFloat(d.coeficiente).toFixed(2)}</Text>
                              </View>
                          ))}
                      </View>
                  </View>
              )}
              
              <View style={{ marginBottom: 20 }}></View>
            </View>
           );
        })}

        <Text style={styles.footer} fixed render={({ pageNumber, totalPages }) => (
            `Página ${pageNumber} de ${totalPages} - Sistema de Votaciones Acotur`
        )} />
        
      </Page>
    </Document>
  );
};

export default ReportePDF;