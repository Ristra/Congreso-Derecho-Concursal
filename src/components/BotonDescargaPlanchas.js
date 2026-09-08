'use client';
import React from 'react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import ReportePlanchasPDF from './ReportePlanchasPDF';

const BotonDescargaPlanchas = ({ item }) => {
  if (!item) return null;

  const fileName = `Dashboard_Planchas_Votacion_${item.id}.pdf`;

  return (
    <PDFDownloadLink
      document={<ReportePlanchasPDF item={item} />}
      fileName={fileName}
      className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 text-sm shadow-md transition-all whitespace-nowrap"
    >
      {({ loading }) => (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {loading ? 'Preparando...' : 'Descargar Dashboard PDF'}
          </>
      )}
    </PDFDownloadLink>
  );
};

export default BotonDescargaPlanchas;