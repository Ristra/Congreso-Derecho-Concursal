'use client';
import React from 'react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import ReporteFinalPDF from './ReporteFinalPDF';

const BotonReporteFinal = ({ data, stats, preguntas, preguntasRespondidas }) => {
  if (!data) return null;

  return (
    <PDFDownloadLink
      document={<ReporteFinalPDF data={data} stats={stats} preguntas={preguntas} preguntasRespondidas={preguntasRespondidas} />}
      fileName="Informe_Final_Asistencia_Congreso_Derecho_Concursal.pdf"
      className="w-full bg-blue-700 hover:bg-blue-800 text-white py-3 rounded-lg font-bold shadow-lg flex justify-center items-center gap-2 animate-pulse"
    >
      {({ loading }) => (
          <>
            <span className="text-xl">📄</span>
            {loading ? 'Generando Informe...' : 'DESCARGAR INFORME FINAL'}
          </>
      )}
    </PDFDownloadLink>
  );
};

export default BotonReporteFinal;