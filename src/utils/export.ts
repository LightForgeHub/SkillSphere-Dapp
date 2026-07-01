import { Session } from '@/utils/types/types';

/**
 * Export session history to CSV format
 * @param sessions Array of session objects to export
 */
export function exportToCSV(sessions: Session[]): void {
  if (sessions.length === 0) {
    console.warn('No sessions to export');
    return;
  }

  // CSV Header
  const headers = ['Date', 'Duration', 'Rate', 'Amount', 'Expert', 'Category', 'Status'];

  // CSV Rows
  const rows = sessions.map(session => [
    session.date,
    session.duration,
    session.price,
    calculateAmount(session.price, session.duration),
    session.expertName,
    session.category,
    session.status
  ]);

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  // Create and trigger download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `session-history-${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

/**
 * Export session history to PDF receipt format
 * @param sessions Array of session objects to export
 */
export function exportToPDF(sessions: Session[]): void {
  if (sessions.length === 0) {
    console.warn('No sessions to export');
    return;
  }

  // Create HTML content for PDF
  const htmlContent = generatePDFHTML(sessions);

  // Create a new window to print
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    console.error('Failed to open print window');
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Session History Receipt</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          margin: 0;
          padding: 40px;
          background: #f5f5f5;
        }
        .receipt {
          max-width: 800px;
          margin: 0 auto;
          background: white;
          padding: 40px;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 2px solid #6366f1;
        }
        .header h1 {
          margin: 0;
          color: #1e1b4b;
          font-size: 28px;
        }
        .header p {
          margin: 10px 0 0;
          color: #6b7280;
        }
        .summary {
          background: #f8fafc;
          padding: 20px;
          border-radius: 6px;
          margin-bottom: 30px;
        }
        .summary-row {
          display: flex;
          justify-content: space-between;
          margin: 10px 0;
          font-size: 14px;
        }
        .summary-row.total {
          font-weight: bold;
          font-size: 16px;
          color: #1e1b4b;
          margin-top: 15px;
          padding-top: 15px;
          border-top: 1px solid #e2e8f0;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        th {
          background: #6366f1;
          color: white;
          padding: 12px;
          text-align: left;
          font-weight: 600;
          font-size: 14px;
        }
        td {
          padding: 12px;
          border-bottom: 1px solid #e2e8f0;
          font-size: 13px;
        }
        tr:nth-child(even) {
          background: #f8fafc;
        }
        .status {
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
        }
        .status.completed {
          background: #dcfce7;
          color: #166534;
        }
        .status.active {
          background: #dbeafe;
          color: #1e40af;
        }
        .status.upcoming {
          background: #fef9c3;
          color: #854d0e;
        }
        .status.cancelled {
          background: #fee2e2;
          color: #991b1b;
        }
        .footer {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e2e8f0;
          text-align: center;
          color: #6b7280;
          font-size: 12px;
        }
        @media print {
          body {
            background: white;
            padding: 0;
          }
          .receipt {
            box-shadow: none;
            padding: 20px;
          }
        }
      </style>
    </head>
    <body>
      ${htmlContent}
      <script>
        window.onload = function() {
          window.print();
        }
      </script>
    </body>
    </html>
  `);

  printWindow.document.close();
}

/**
 * Generate HTML content for PDF receipt
 */
function generatePDFHTML(sessions: Session[]): string {
  const totalAmount = sessions.reduce((sum, session) => {
    return sum + parseFloat(calculateAmount(session.price, session.duration).replace(/[^0-9.-]+/g, ''));
  }, 0);

  const completedSessions = sessions.filter(s => s.status === 'completed').length;
  const totalSessions = sessions.length;

  const rows = sessions.map(session => `
    <tr>
      <td>${session.date}</td>
      <td>${session.time}</td>
      <td>${session.duration}</td>
      <td>${session.expertName}</td>
      <td>${session.category}</td>
      <td>${session.price}</td>
      <td>${calculateAmount(session.price, session.duration)}</td>
      <td><span class="status ${session.status}">${session.status}</span></td>
    </tr>
  `).join('');

  return `
    <div class="receipt">
      <div class="header">
        <h1>Session History Receipt</h1>
        <p>Generated on ${new Date().toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })}</p>
      </div>

      <div class="summary">
        <div class="summary-row">
          <span>Total Sessions:</span>
          <span>${totalSessions}</span>
        </div>
        <div class="summary-row">
          <span>Completed Sessions:</span>
          <span>${completedSessions}</span>
        </div>
        <div class="summary-row total">
          <span>Total Amount:</span>
          <span>$${totalAmount.toFixed(2)}</span>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Time</th>
            <th>Duration</th>
            <th>Expert</th>
            <th>Category</th>
            <th>Rate</th>
            <th>Amount</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>

      <div class="footer">
        <p>This is an automatically generated receipt for your session history.</p>
        <p>Thank you for using SkillSphere.</p>
      </div>
    </div>
  `;
}

/**
 * Calculate total amount based on price and duration
 */
function calculateAmount(price: string, duration: string): string {
  // Extract numeric value from price (e.g., "$50" -> 50)
  const priceValue = parseFloat(price.replace(/[^0-9.-]+/g, ''));
  
  // Extract duration in minutes (e.g., "60 mins" -> 60)
  const durationValue = parseFloat(duration.replace(/[^0-9.-]+/g, ''));
  
  // Calculate hourly rate
  const hourlyRate = priceValue;
  
  // Calculate amount based on duration
  const amount = (hourlyRate * (durationValue / 60));
  
  return `$${amount.toFixed(2)}`;
}
