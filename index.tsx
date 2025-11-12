import React, { useState, useEffect, useReducer } from 'react';
import { createRoot } from 'react-dom/client';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const initialState = {
    customers: [],
    settings: {
        companyName: '',
        companyAddress: '',
        companyIcon: '',
        deadlineDays: 10,
        bankName: '',
        bankAccountNumber: '',
        footerText: '',
        invoicePrefix: 'INV',
        invoiceNumber: 1,
        outputPdfPath: '',
        currency: 'CHF',
    },
    currentInvoice: {
        customer: null,
        invoiceDate: new Date().toISOString().split('T')[0],
        dueDate: '',
        items: [{ description: '', date: '', hours: 1, rate: 50 }],
    },
    view: 'main', // 'main' or 'settings'
};

function reducer(state, action) {
    switch (action.type) {
        case 'SET_CUSTOMERS':
            return { ...state, customers: action.payload };
        case 'ADD_CUSTOMER':
            const newCustomers = [...state.customers, action.payload];
            return { ...state, customers: newCustomers };
        case 'SET_SETTINGS':
            return { ...state, settings: { ...state.settings, ...action.payload } };
        case 'UPDATE_INVOICE_FIELD':
            return { ...state, currentInvoice: { ...state.currentInvoice, [action.field]: action.value } };
        case 'UPDATE_INVOICE_ITEM':
            const items = [...state.currentInvoice.items];
            items[action.index][action.field] = action.value;
            return { ...state, currentInvoice: { ...state.currentInvoice, items } };
        case 'ADD_INVOICE_ITEM':
            return { ...state, currentInvoice: { ...state.currentInvoice, items: [...state.currentInvoice.items, { description: '', date: '', hours: 1, rate: 50 }] } };
        case 'REMOVE_INVOICE_ITEM':
            const filteredItems = state.currentInvoice.items.filter((_, i) => i !== action.index);
            return { ...state, currentInvoice: { ...state.currentInvoice, items: filteredItems } };
        case 'INCREMENT_INVOICE_NUMBER':
            return { ...state, settings: { ...state.settings, invoiceNumber: state.settings.invoiceNumber + 1 } };
        case 'SET_VIEW':
            return { ...state, view: action.payload };
        case 'RESET_INVOICE':
             return {
                ...state,
                currentInvoice: {
                    ...initialState.currentInvoice,
                    dueDate: calculateDueDate(new Date().toISOString().split('T')[0], state.settings.deadlineDays)
                }
            };
        default:
            return state;
    }
}

function calculateDueDate(invoiceDate, deadlineDays) {
    const date = new Date(invoiceDate);
    date.setDate(date.getDate() + deadlineDays);
    return date.toISOString().split('T')[0];
}


const App = () => {
    const [state, dispatch] = useReducer(reducer, initialState);
    const [newCustomerName, setNewCustomerName] = useState('');
    const [newCustomerAddress, setNewCustomerAddress] = useState('');
    const [showAddCustomer, setShowAddCustomer] = useState(false);

    useEffect(() => {
        // Mock loading customers and settings
        const loadedCustomers = [
            { id: 1, name: 'John Doe', address: '123 Main St, Anytown, USA' },
            { id: 2, name: 'Jane Smith', address: '456 Oak Ave, Sometown, USA' },
        ];
        dispatch({ type: 'SET_CUSTOMERS', payload: loadedCustomers });

        const loadedSettings = {
            companyName: 'My Awesome Company',
            companyAddress: '789 Pine Ln, Yourtown, USA',
            companyIcon: '', // Will be base64
            deadlineDays: 10,
            bankName: 'Global Bank',
            bankAccountNumber: '123-456-7890',
            footerText: 'Thank you for your business!',
            invoicePrefix: 'INV',
            invoiceNumber: 101,
            outputPdfPath: '/Users/me/Documents/Invoices',
            currency: 'CHF',
        };
        dispatch({ type: 'SET_SETTINGS', payload: loadedSettings });

        dispatch({
            type: 'UPDATE_INVOICE_FIELD',
            field: 'dueDate',
            value: calculateDueDate(state.currentInvoice.invoiceDate, loadedSettings.deadlineDays)
        });
    }, []);
    
    useEffect(() => {
        dispatch({
            type: 'UPDATE_INVOICE_FIELD',
            field: 'dueDate',
            value: calculateDueDate(state.currentInvoice.invoiceDate, state.settings.deadlineDays)
        });
    }, [state.currentInvoice.invoiceDate, state.settings.deadlineDays]);


    const handleAddCustomer = (e) => {
        e.preventDefault();
        if (newCustomerName.trim() && newCustomerAddress.trim()) {
            const newCustomer = {
                id: state.customers.length + 1,
                name: newCustomerName,
                address: newCustomerAddress,
            };
            dispatch({ type: 'ADD_CUSTOMER', payload: newCustomer });
            dispatch({ type: 'UPDATE_INVOICE_FIELD', field: 'customer', value: newCustomer.id.toString() });
            setNewCustomerName('');
            setNewCustomerAddress('');
            setShowAddCustomer(false);
        }
    };

    const handleGeneratePdf = () => {
        const { settings, currentInvoice, customers } = state;
        const customer = customers.find(c => c.id === parseInt(currentInvoice.customer));
        if (!customer) {
            alert('Please select a customer.');
            return;
        }

        const doc = new jsPDF();
        
        // Header
        if (settings.companyIcon) {
            try {
                doc.addImage(settings.companyIcon, 'PNG', 14, 15, 30, 30);
            } catch (e) {
                console.error("Error adding image to PDF:", e);
                doc.setFontSize(22);
                doc.text(settings.companyName, 14, 25);
            }
        } else {
            doc.setFontSize(22);
            doc.text(settings.companyName, 14, 25);
        }

        doc.setFontSize(10);
        doc.text(settings.companyAddress, 14, 50);

        // Invoice Info
        const invoiceNumberText = `${settings.invoicePrefix}-${settings.invoiceNumber}`;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('INVOICE NO:', 140, 40);
        doc.text('DATE:', 140, 45);
        doc.text('DUE DATE:', 140, 50);
        doc.setFont('helvetica', 'normal');
        doc.text(invoiceNumberText, 170, 40);
        doc.text(currentInvoice.invoiceDate, 170, 45);
        doc.text(currentInvoice.dueDate, 170, 50);

        // Customer Info
        doc.setFont('helvetica', 'bold');
        doc.text('ISSUED TO:', 14, 70);
        doc.setFont('helvetica', 'normal');
        doc.text(customer.name, 14, 75);
        doc.text(customer.address, 14, 80);

        // Bank Info
        doc.setFont('helvetica', 'bold');
        doc.text('PAY TO:', 14, 95);
        doc.setFont('helvetica', 'normal');
        doc.text(settings.bankName, 14, 100);
        doc.text(`Account No.: ${settings.bankAccountNumber}`, 14, 105);

        // Line Items
        const tableColumn = ["DESCRIPTION", "DATE", "HOURS", `RATE (${settings.currency})`, "TOTAL"];
        const tableRows = [];
        let subtotal = 0;

        currentInvoice.items.forEach(item => {
            const total = (item.hours || 0) * (item.rate || 0);
            subtotal += total;
            const itemData = [
                item.description,
                item.date,
                item.hours,
                `${item.rate.toFixed(2)}`,
                `${total.toFixed(2)}`
            ];
            tableRows.push(itemData);
        });
        
        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 120,
            headStyles: {
                fillColor: [241, 243, 245],
                textColor: [33, 37, 41],
                fontStyle: 'bold'
            },
            theme: 'grid',
             didParseCell: function (data) {
                if (data.column.index >= 3 && data.section === 'body') {
                    data.cell.styles.halign = 'right';
                }
            }
        });

        // Totals
        const finalY = (doc as any).lastAutoTable.finalY;
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('SUBTOTAL', 140, finalY + 10);
        doc.text('TOTAL', 140, finalY + 17);
        doc.setFont('helvetica', 'normal');
        doc.text(`${settings.currency} ${subtotal.toFixed(2)}`, 195, finalY + 10, { align: 'right' });
        doc.setFont('helvetica', 'bold');
        doc.text(`${settings.currency} ${subtotal.toFixed(2)}`, 195, finalY + 17, { align: 'right' });


        // Footer
        doc.setFontSize(10);
        doc.text(settings.footerText, 105, 280, { align: 'center' });
        
        doc.save(`invoice-${invoiceNumberText}.pdf`);

        dispatch({ type: 'INCREMENT_INVOICE_NUMBER' });
        dispatch({ type: 'RESET_INVOICE' });
    };

    const handleSettingsChange = (e) => {
        const { name, value } = e.target;
        dispatch({ type: 'SET_SETTINGS', payload: { [name]: value } });
    };

    const handleIconUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                dispatch({ type: 'SET_SETTINGS', payload: { companyIcon: event.target.result } });
            };
            reader.readAsDataURL(file);
        }
    };

    const renderMainView = () => (
        <div className="container">
            <header>
                <h1>Invoice Generator</h1>
                <button onClick={() => dispatch({ type: 'SET_VIEW', payload: 'settings' })} className="icon-button" aria-label="Settings">
                    <i className="fas fa-cog"></i>
                </button>
            </header>
            <main>
                <div className="invoice-form">
                    <section className="card">
                        <h2>Customer</h2>
                        <select
                            value={state.currentInvoice.customer || ''}
                            onChange={(e) => dispatch({ type: 'UPDATE_INVOICE_FIELD', field: 'customer', value: e.target.value })}
                        >
                            <option value="" disabled>Select a customer</option>
                            {state.customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <button onClick={() => setShowAddCustomer(!showAddCustomer)} className="secondary mt-1">
                            {showAddCustomer ? 'Cancel' : '+ New Customer'}
                        </button>
                        {showAddCustomer && (
                            <form onSubmit={handleAddCustomer} className="add-customer-form">
                                <input type="text" placeholder="Customer Name" value={newCustomerName} onChange={(e) => setNewCustomerName(e.target.value)} required />
                                <input type="text" placeholder="Customer Address" value={newCustomerAddress} onChange={(e) => setNewCustomerAddress(e.target.value)} required />
                                <button type="submit" className="primary">Save Customer</button>
                            </form>
                        )}
                    </section>

                    <section className="card">
                        <h2>Invoice Details</h2>
                        <div className="invoice-details">
                            <div>
                                <label>Invoice #</label>
                                <input type="text" value={`${state.settings.invoicePrefix}-${state.settings.invoiceNumber}`} readOnly />
                            </div>
                            <div>
                                <label>Invoice Date</label>
                                <input type="date" value={state.currentInvoice.invoiceDate} onChange={(e) => dispatch({ type: 'UPDATE_INVOICE_FIELD', field: 'invoiceDate', value: e.target.value })} />
                            </div>
                             <div>
                                <label>Due Date</label>
                                <input type="date" value={state.currentInvoice.dueDate} onChange={(e) => dispatch({ type: 'UPDATE_INVOICE_FIELD', field: 'dueDate', value: e.target.value })} />
                            </div>
                        </div>
                    </section>
                    
                    <section className="card">
                        <h2>Line Items</h2>
                        <div className="line-items-table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Description</th>
                                        <th>Date</th>
                                        <th>Hours</th>
                                        <th>Rate ({state.settings.currency})</th>
                                        <th>Total</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {state.currentInvoice.items.map((item, index) => (
                                        <tr key={index}>
                                            <td data-label="Description"><input type="text" placeholder="Service description" value={item.description} onChange={(e) => dispatch({ type: 'UPDATE_INVOICE_ITEM', index, field: 'description', value: e.target.value })} /></td>
                                            <td data-label="Date"><input type="date" value={item.date} onChange={(e) => dispatch({ type: 'UPDATE_INVOICE_ITEM', index, field: 'date', value: e.target.value })} /></td>
                                            <td data-label="Hours"><input type="number" value={item.hours} min="0" step="0.25" onChange={(e) => dispatch({ type: 'UPDATE_INVOICE_ITEM', index, field: 'hours', value: parseFloat(e.target.value) || 0 })} /></td>
                                            <td data-label="Rate"><input type="number" value={item.rate} min="0" step="0.01" onChange={(e) => dispatch({ type: 'UPDATE_INVOICE_ITEM', index, field: 'rate', value: parseFloat(e.target.value) || 0 })} /></td>
                                            <td data-label="Total" className="item-total">{state.settings.currency} {((item.hours || 0) * (item.rate || 0)).toFixed(2)}</td>
                                            <td><button onClick={() => dispatch({ type: 'REMOVE_INVOICE_ITEM', index })} className="icon-button danger" aria-label="Remove item"><i className="fas fa-trash"></i></button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <button onClick={() => dispatch({ type: 'ADD_INVOICE_ITEM' })} className="secondary mt-1">Add Line Item</button>
                    </section>
                    
                    <div className="actions">
                        <button onClick={handleGeneratePdf} className="primary">Generate Invoice PDF</button>
                    </div>
                </div>
            </main>
        </div>
    );
    
    const renderSettingsView = () => (
        <div className="container">
            <header>
                <h1>Settings</h1>
                <button onClick={() => dispatch({ type: 'SET_VIEW', payload: 'main' })} className="icon-button" aria-label="Back to main">
                    <i className="fas fa-arrow-left"></i>
                </button>
            </header>
            <main>
                <div className="settings-form card">
                    <div className="form-grid">
                        <div className="form-group">
                            <label>Company Name</label>
                            <input type="text" name="companyName" value={state.settings.companyName} onChange={handleSettingsChange} />
                        </div>
                        <div className="form-group">
                            <label>Company Address</label>
                            <input type="text" name="companyAddress" value={state.settings.companyAddress} onChange={handleSettingsChange} />
                        </div>
                        <div className="form-group">
                            <label>Company Icon</label>
                            <input type="file" accept="image/*" onChange={handleIconUpload} />
                            {state.settings.companyIcon && <img src={state.settings.companyIcon} alt="Company Icon" className="company-icon-preview" />}
                        </div>
                        <div className="form-group">
                            <label>Currency</label>
                            <input type="text" name="currency" value={state.settings.currency} onChange={handleSettingsChange} />
                        </div>
                        <div className="form-group">
                            <label>Deadline (days)</label>
                            <input type="number" name="deadlineDays" value={state.settings.deadlineDays} onChange={(e) => handleSettingsChange({target: {name: 'deadlineDays', value: parseInt(e.target.value, 10) || 0}})} />
                        </div>
                        <div className="form-group">
                            <label>Bank Name</label>
                            <input type="text" name="bankName" value={state.settings.bankName} onChange={handleSettingsChange} />
                        </div>
                        <div className="form-group">
                            <label>Bank Account Number</label>
                            <input type="text" name="bankAccountNumber" value={state.settings.bankAccountNumber} onChange={handleSettingsChange} />
                        </div>
                        <div className="form-group">
                            <label>Invoice Number Prefix</label>
                            <input type="text" name="invoicePrefix" value={state.settings.invoicePrefix} onChange={handleSettingsChange} />
                        </div>
                         <div className="form-group">
                            <label>Next Invoice Number</label>
                            <input type="number" name="invoiceNumber" value={state.settings.invoiceNumber} onChange={(e) => handleSettingsChange({target: {name: 'invoiceNumber', value: parseInt(e.target.value, 10) || 1}})} />
                        </div>
                        <div className="form-group full-width">
                           <label>Invoice Footer Text</label>
                           <input type="text" name="footerText" value={state.settings.footerText} onChange={handleSettingsChange} />
                        </div>
                         <div className="form-group full-width">
                            <label>Output PDF Path</label>
                            <input type="text" name="outputPdfPath" value={state.settings.outputPdfPath} onChange={handleSettingsChange} placeholder="e.g., C:\Users\YourUser\Documents\Invoices" />
                            <p className="field-description">Note: Due to browser security, PDFs will be downloaded via a prompt. This path is for your reference.</p>
                        </div>
                    </div>
                    <div className="actions">
                        <button className="primary" onClick={() => alert('Settings saved (mock)!')}>Save Settings</button>
                    </div>
                </div>
            </main>
        </div>
    );

    return (
        <>
            <style>{`
                :root {
                    --primary-color: #007bff;
                    --primary-color-hover: #0056b3;
                    --secondary-color: #6c757d;
                    --secondary-color-hover: #5a6268;
                    --danger-color: #dc3545;
                    --danger-color-hover: #c82333;
                    --background-color: #f8f9fa;
                    --surface-color: #ffffff;
                    --text-color: #212529;
                    --text-color-light: #6c757d;
                    --border-color: #dee2e6;
                    --font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                    --border-radius: 6px;
                    --box-shadow: 0 1px 3px rgba(0,0,0,0.05);
                }
                *, *::before, *::after {
                    box-sizing: border-box;
                }
                body {
                    font-family: var(--font-family);
                    background-color: var(--background-color);
                    color: var(--text-color);
                    margin: 0;
                    padding: 24px;
                }
                .container {
                    max-width: 900px;
                    margin: 0 auto;
                }
                header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 24px;
                }
                header h1 {
                    margin: 0;
                    font-size: 1.75rem;
                    font-weight: 700;
                }
                main {
                    display: grid;
                    gap: 24px;
                }
                .card {
                    background-color: var(--surface-color);
                    border-radius: var(--border-radius);
                    box-shadow: var(--box-shadow);
                    border: 1px solid var(--border-color);
                    padding: 24px;
                }
                h2 {
                    font-size: 1.25rem;
                    margin-top: 0;
                    margin-bottom: 16px;
                }
                label {
                    display: block;
                    margin-bottom: 8px;
                    font-weight: 500;
                    font-size: 0.875rem;
                }
                input[type="text"], input[type="number"], input[type="date"], input[type="file"], select {
                    width: 100%;
                    padding: 10px 12px;
                    border: 1px solid var(--border-color);
                    border-radius: var(--border-radius);
                    font-size: 1rem;
                    font-family: inherit;
                    transition: border-color 0.2s, box-shadow 0.2s;
                }
                input:focus, select:focus {
                    outline: none;
                    border-color: var(--primary-color);
                    box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
                }
                .invoice-details {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                    gap: 16px;
                }
                .line-items-table-container {
                    overflow-x: auto;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                }
                th, td {
                    text-align: left;
                    padding: 12px;
                    vertical-align: middle;
                }
                th {
                    background-color: #f8f9fa;
                    font-size: 0.75rem;
                    text-transform: uppercase;
                    color: var(--text-color-light);
                    font-weight: 500;
                }
                td {
                    border-bottom: 1px solid var(--border-color);
                }
                tr:last-child td {
                    border-bottom: none;
                }
                td input {
                    padding: 6px;
                    height: 36px;
                }
                td:nth-child(3), td:nth-child(4) { width: 15%; }
                td:nth-child(5) { width: 20%; font-weight: 500; }
                td:nth-child(6) { width: 5%; text-align: right; }
                .item-total { text-align: right; padding-right: 12px; }

                button {
                    padding: 10px 16px;
                    border: 1px solid transparent;
                    border-radius: var(--border-radius);
                    cursor: pointer;
                    font-size: 0.9375rem;
                    font-weight: 500;
                    font-family: inherit;
                    transition: all 0.2s;
                }
                button.primary {
                    background-color: var(--primary-color);
                    color: white;
                }
                button.primary:hover {
                    background-color: var(--primary-color-hover);
                }
                button.secondary {
                    background-color: var(--surface-color);
                    color: var(--text-color);
                    border-color: var(--border-color);
                }
                button.secondary:hover {
                    background-color: #f8f9fa;
                }
                button.icon-button {
                    background: none;
                    border: none;
                    color: var(--text-color-light);
                    font-size: 1.2rem;
                    padding: 8px;
                    line-height: 1;
                }
                .icon-button:hover {
                    color: var(--text-color);
                }
                .danger {
                    color: var(--danger-color);
                }
                 .icon-button.danger:hover {
                    color: var(--danger-color-hover);
                }
                .mt-1 { margin-top: 16px; }

                .add-customer-form {
                    margin-top: 16px;
                    padding-top: 16px;
                    border-top: 1px solid var(--border-color);
                    display: grid;
                    gap: 12px;
                }
                .actions {
                    display: flex;
                    justify-content: flex-end;
                    margin-top: 24px;
                }
                .settings-form .form-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 16px 24px;
                }
                .form-group.full-width {
                    grid-column: 1 / -1;
                }
                .company-icon-preview {
                    max-width: 100px;
                    margin-top: 10px;
                    border: 1px solid var(--border-color);
                    border-radius: var(--border-radius);
                }
                .field-description {
                    font-size: 0.8rem;
                    color: var(--text-color-light);
                    margin-top: 5px;
                }
            `}</style>
            {state.view === 'main' ? renderMainView() : renderSettingsView()}
        </>
    );
};

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<App />);