
import React, { useState, useEffect, useReducer } from 'react';
import { createRoot } from 'react-dom/client';

const initialState = {
    customers: [],
    settings: {
        companyName: '',
        companyAddress: '',
        companyIcon: '',
        deadlineDays: 10,
        defaultHourlyRate: 50,
        bankName: '',
        bankAccountNumber: '',
        footerText: '',
        invoicePrefix: 'INV',
        invoiceNumber: 1,
        outputPdfPath: '',
        currency: 'CHF',
        theme: 'system', // 'light', 'dark', 'system'
        dateFormat: 'yyyy/mm/dd', // 'dd/mm/yyyy', 'yyyy/mm/dd'
    },
    currentInvoice: {
        customer: null,
        invoiceDate: new Date().toISOString().split('T')[0],
        dueDate: '',
        items: [{ description: '', date: new Date().toISOString().split('T')[0], hours: 1, rate: 50 }],
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
            return { ...state, currentInvoice: { ...state.currentInvoice, items: [...state.currentInvoice.items, { description: '', date: new Date().toISOString().split('T')[0], hours: 1, rate: state.settings.defaultHourlyRate || 50 }] } };
        case 'REMOVE_INVOICE_ITEM':
            const filteredItems = state.currentInvoice.items.filter((_, i) => i !== action.index);
            return { ...state, currentInvoice: { ...state.currentInvoice, items: filteredItems } };
        case 'INCREMENT_INVOICE_NUMBER':
            return { ...state, settings: { ...state.settings, invoiceNumber: state.settings.invoiceNumber + 1 } };
        case 'SET_VIEW':
            return { ...state, view: action.payload };
        case 'RESET_INVOICE':
            const today = new Date().toISOString().split('T')[0];
            return {
                ...state,
                currentInvoice: {
                    customer: null,
                    invoiceDate: today,
                    dueDate: calculateDueDate(today, state.settings.deadlineDays),
                    items: [{ description: '', date: today, hours: 1, rate: state.settings.defaultHourlyRate || 50 }],
                }
            };
        default:
            return state;
    }
}

function calculateDueDate(invoiceDate, deadlineDays) {
    if (!invoiceDate || isNaN(new Date(invoiceDate).getTime())) {
        return '';
    }
    const date = new Date(invoiceDate);
    date.setDate(date.getDate() + deadlineDays);
    return date.toISOString().split('T')[0];
}


function formatDate(isoString, format) {
    if (!isoString || typeof isoString !== 'string' || !isoString.includes('-')) return isoString || '';
    try {
        const date = new Date(isoString);
        if (isNaN(date.getTime())) return isoString;

        const year = date.getUTCFullYear();
        const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
        const day = date.getUTCDate().toString().padStart(2, '0');

        if (format === 'dd/mm/yyyy') {
            return `${day}/${month}/${year}`;
        }
        return `${year}/${month}/${day}`;
    } catch (e) {
        console.error("Could not format date:", isoString, e);
        return isoString;
    }
}

function parseDate(formattedString, format) {
    if (!formattedString || typeof formattedString !== 'string') return '';
    
    // Allow empty string to clear date
    if (formattedString.trim() === '') return '';

    const separator = formattedString.includes('/') ? '/' : '-';
    const parts = formattedString.split(separator);
    if (parts.length !== 3) return null;

    let day, month, year;
    try {
        if (format === 'dd/mm/yyyy') {
            day = parseInt(parts[0], 10);
            month = parseInt(parts[1], 10);
            year = parseInt(parts[2], 10);
        } else { // 'yyyy/mm/dd'
            year = parseInt(parts[0], 10);
            month = parseInt(parts[1], 10);
            day = parseInt(parts[2], 10);
        }

        if (isNaN(day) || isNaN(month) || isNaN(year) || month < 1 || month > 12 || day < 1 || day > 31 || year < 1000 || year > 9999) {
            return null;
        }

        // Basic validation passed, format to YYYY-MM-DD
        const isoMonth = month.toString().padStart(2, '0');
        const isoDay = day.toString().padStart(2, '0');
        
        const date = new Date(`${year}-${isoMonth}-${isoDay}T00:00:00.000Z`);
        if (isNaN(date.getTime()) || date.getUTCDate() !== day) {
             return null;
        }

        return `${year}-${isoMonth}-${isoDay}`;

    } catch (e) {
        return null;
    }
}


const App = () => {
    const [state, dispatch] = useReducer(reducer, initialState);
    const [newCustomerName, setNewCustomerName] = useState('');
    const [newCustomerAddress, setNewCustomerAddress] = useState('');
    const [showAddCustomer, setShowAddCustomer] = useState(false);

    // Local state for date inputs to allow partial/invalid user input without breaking the app state
    const [dateInputs, setDateInputs] = useState({
        invoiceDate: '',
        dueDate: '',
        items: {}
    });

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
            defaultHourlyRate: 75,
            bankName: 'Global Bank',
            bankAccountNumber: '123-456-7890',
            footerText: 'Thank you for your business!',
            invoicePrefix: 'INV',
            invoiceNumber: 101,
            outputPdfPath: '/Users/me/Documents/Invoices',
            currency: 'CHF',
            theme: 'system',
            dateFormat: 'yyyy/mm/dd',
        };
        dispatch({ type: 'SET_SETTINGS', payload: loadedSettings });
        
        const initialInvoiceDate = new Date().toISOString().split('T')[0];
        const initialDueDate = calculateDueDate(initialInvoiceDate, loadedSettings.deadlineDays);
        dispatch({ type: 'UPDATE_INVOICE_FIELD', field: 'invoiceDate', value: initialInvoiceDate});
        dispatch({ type: 'UPDATE_INVOICE_FIELD', field: 'dueDate', value: initialDueDate});

        // Set initial invoice item rate from loaded settings
        dispatch({ type: 'UPDATE_INVOICE_ITEM', index: 0, field: 'rate', value: loadedSettings.defaultHourlyRate });
    }, []);
    
    // Sync local date input state when global state or format changes
    useEffect(() => {
        setDateInputs(prev => ({
            ...prev,
            invoiceDate: formatDate(state.currentInvoice.invoiceDate, state.settings.dateFormat),
            dueDate: formatDate(state.currentInvoice.dueDate, state.settings.dateFormat),
            items: state.currentInvoice.items.reduce((acc, item, index) => {
                acc[index] = formatDate(item.date, state.settings.dateFormat);
                return acc;
            }, {})
        }));
    }, [state.currentInvoice.invoiceDate, state.currentInvoice.dueDate, state.currentInvoice.items, state.settings.dateFormat]);


    useEffect(() => {
        dispatch({
            type: 'UPDATE_INVOICE_FIELD',
            field: 'dueDate',
            value: calculateDueDate(state.currentInvoice.invoiceDate, state.settings.deadlineDays)
        });
    }, [state.currentInvoice.invoiceDate, state.settings.deadlineDays]);

    useEffect(() => {
        const applyTheme = () => {
            const theme = state.settings.theme;
            if (theme === 'system') {
                const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                document.body.dataset.theme = systemPrefersDark ? 'dark' : 'light';
            } else {
                document.body.dataset.theme = theme;
            }
        };

        applyTheme();
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        mediaQuery.addEventListener('change', applyTheme);
        return () => mediaQuery.removeEventListener('change', applyTheme);
    }, [state.settings.theme]);


    const handleAddCustomer = (e) => {
        e.preventDefault();
        if (newCustomerName.trim() && newCustomerAddress.trim()) {
            const newCustomerId = Math.max(0, ...state.customers.map(c => c.id)) + 1;
            const newCustomer = {
                id: newCustomerId,
                name: newCustomerName,
                address: newCustomerAddress,
            };
            dispatch({ type: 'ADD_CUSTOMER', payload: newCustomer });
            dispatch({ type: 'UPDATE_INVOICE_FIELD', field: 'customer', value: newCustomerId.toString() });
            setNewCustomerName('');
            setNewCustomerAddress('');
            setShowAddCustomer(false);
        }
    };
    
    // FIX: The `handleDateInputChange` function was refactored to accept a field name string
    // instead of a handler function. This resolves an error where the code was incorrectly
    // trying to access properties on the `setDateInputs` state setter function, which is not possible.
    // This also simplifies the logic for updating both local and global state.
    const handleDateInputChange = (value, field) => {
        setDateInputs(p => ({ ...p, [field]: value })); // Update local state immediately for smooth typing
        const isoDate = parseDate(value, state.settings.dateFormat);
        if (isoDate !== null) { // If valid or empty string
            // Dispatch action to update global state
            dispatch({ type: 'UPDATE_INVOICE_FIELD', field, value: isoDate });
        }
    };

    const handleItemDateInputChange = (value, index) => {
        setDateInputs(prev => ({...prev, items: {...prev.items, [index]: value}}));
        const isoDate = parseDate(value, state.settings.dateFormat);
        if (isoDate !== null) {
            dispatch({ type: 'UPDATE_INVOICE_ITEM', index, field: 'date', value: isoDate });
        }
    };


    const handleGeneratePdf = async () => {
        const { default: jsPDF } = await import('jspdf');
        const { default: autoTable } = await import('jspdf-autotable');

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
        doc.text(formatDate(currentInvoice.invoiceDate, settings.dateFormat), 170, 45);
        doc.text(formatDate(currentInvoice.dueDate, settings.dateFormat), 170, 50);

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
                formatDate(item.date, settings.dateFormat),
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
        const { name, value, type } = e.target;
        dispatch({ type: 'SET_SETTINGS', payload: { [name]: type === 'number' ? (parseFloat(value) || 0) : value } });
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
                <h1>Sinvoice - Invoices made simple</h1>
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
                            {showAddCustomer ? 'Cancel' : <><i className="fas fa-plus"></i> New Customer</>}
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
                                <input type="text" 
                                    placeholder={state.settings.dateFormat}
                                    value={dateInputs.invoiceDate} 
                                    // FIX: Pass the field name 'invoiceDate' to the updated `handleDateInputChange` function.
                                    onChange={(e) => handleDateInputChange(e.target.value, 'invoiceDate')}
                                    onBlur={() => {
                                        const isoDate = parseDate(dateInputs.invoiceDate, state.settings.dateFormat);
                                        if (isoDate !== null) {
                                            dispatch({ type: 'UPDATE_INVOICE_FIELD', field: 'invoiceDate', value: isoDate });
                                        } else {
                                            // Revert to last valid state on invalid blur
                                            setDateInputs(p => ({...p, invoiceDate: formatDate(state.currentInvoice.invoiceDate, state.settings.dateFormat)}));
                                        }
                                    }}
                                />
                            </div>
                             <div>
                                <label>Due Date</label>
                                <input type="text" 
                                    placeholder={state.settings.dateFormat}
                                    value={dateInputs.dueDate} 
                                    // FIX: Pass the field name 'dueDate' to the updated `handleDateInputChange` function.
                                    onChange={(e) => handleDateInputChange(e.target.value, 'dueDate')}
                                    onBlur={() => {
                                        const isoDate = parseDate(dateInputs.dueDate, state.settings.dateFormat);
                                        if (isoDate !== null) {
                                            dispatch({ type: 'UPDATE_INVOICE_FIELD', field: 'dueDate', value: isoDate });
                                        } else {
                                            setDateInputs(p => ({...p, dueDate: formatDate(state.currentInvoice.dueDate, state.settings.dateFormat)}));
                                        }
                                    }}
                                />
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
                                            <td data-label="Date">
                                                <input type="text" 
                                                    placeholder={state.settings.dateFormat}
                                                    value={dateInputs.items[index] || ''} 
                                                    onChange={(e) => handleItemDateInputChange(e.target.value, index)}
                                                    onBlur={() => {
                                                        const isoDate = parseDate(dateInputs.items[index], state.settings.dateFormat);
                                                         if (isoDate !== null) {
                                                            dispatch({ type: 'UPDATE_INVOICE_ITEM', index, field: 'date', value: isoDate });
                                                        } else {
                                                            setDateInputs(p => ({...p, items: {...p.items, [index]: formatDate(item.date, state.settings.dateFormat)}}));
                                                        }
                                                    }}
                                                />
                                            </td>
                                            <td data-label="Hours"><input type="number" value={item.hours} min="0" step="0.25" onChange={(e) => dispatch({ type: 'UPDATE_INVOICE_ITEM', index, field: 'hours', value: parseFloat(e.target.value) || 0 })} /></td>
                                            <td data-label="Rate"><input type="number" value={item.rate} min="0" step="0.01" onChange={(e) => dispatch({ type: 'UPDATE_INVOICE_ITEM', index, field: 'rate', value: parseFloat(e.target.value) || 0 })} /></td>
                                            <td data-label="Total" className="item-total">{state.settings.currency} {((item.hours || 0) * (item.rate || 0)).toFixed(2)}</td>
                                            <td><button onClick={() => dispatch({ type: 'REMOVE_INVOICE_ITEM', index })} className="icon-button danger" aria-label="Remove item"><i className="fas fa-trash"></i></button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <button onClick={() => dispatch({ type: 'ADD_INVOICE_ITEM' })} className="secondary mt-1"><i className="fas fa-plus"></i> Add Line Item</button>
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
                    <section>
                        <h2>Company Information</h2>
                        <div className="form-grid">
                            <div className="form-group">
                                <label>Company Name</label>
                                <input type="text" name="companyName" value={state.settings.companyName} onChange={handleSettingsChange} />
                            </div>
                            <div className="form-group">
                                <label>Company Address</label>
                                <input type="text" name="companyAddress" value={state.settings.companyAddress} onChange={handleSettingsChange} />
                            </div>
                            <div className="form-group full-width">
                                <label>Company Icon</label>
                                <input type="file" accept="image/*" onChange={handleIconUpload} />
                                {state.settings.companyIcon && <img src={state.settings.companyIcon} alt="Company Icon" className="company-icon-preview" />}
                            </div>
                        </div>
                    </section>

                    <section>
                        <h2>Invoice Settings</h2>
                        <div className="form-grid">
                            <div className="form-group">
                                <label>Invoice Number Prefix</label>
                                <input type="text" name="invoicePrefix" value={state.settings.invoicePrefix} onChange={handleSettingsChange} />
                            </div>
                            <div className="form-group">
                                <label>Next Invoice Number</label>
                                <input type="number" name="invoiceNumber" value={state.settings.invoiceNumber} onChange={handleSettingsChange} />
                            </div>
                            <div className="form-group">
                                <label>Deadline (days)</label>
                                <input type="number" name="deadlineDays" value={state.settings.deadlineDays} onChange={handleSettingsChange} />
                            </div>
                            <div className="form-group">
                                <label>Default Hourly Rate ({state.settings.currency})</label>
                                <input type="number" name="defaultHourlyRate" value={state.settings.defaultHourlyRate} onChange={handleSettingsChange} />
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
                    </section>

                    <section>
                        <h2>Payment Information</h2>
                        <div className="form-grid">
                             <div className="form-group">
                                <label>Bank Name</label>
                                <input type="text" name="bankName" value={state.settings.bankName} onChange={handleSettingsChange} />
                            </div>
                            <div className="form-group">
                                <label>Bank Account Number</label>
                                <input type="text" name="bankAccountNumber" value={state.settings.bankAccountNumber} onChange={handleSettingsChange} />
                            </div>
                        </div>
                    </section>

                     <section>
                        <h2>Localization & Appearance</h2>
                         <div className="form-grid">
                            <div className="form-group">
                                <label>Currency</label>
                                <input type="text" name="currency" value={state.settings.currency} onChange={handleSettingsChange} />
                            </div>
                            <div className="form-group">
                                <label>Date Format</label>
                                <select name="dateFormat" value={state.settings.dateFormat} onChange={handleSettingsChange}>
                                    <option value="yyyy/mm/dd">YYYY/MM/DD</option>
                                    <option value="dd/mm/yyyy">DD/MM/YYYY</option>
                                </select>
                            </div>
                            <div className="form-group full-width">
                                <label>Theme</label>
                                <select name="theme" value={state.settings.theme} onChange={handleSettingsChange}>
                                    <option value="light">Light</option>
                                    <option value="dark">Dark</option>
                                    <option value="system">System</option>
                                </select>
                            </div>
                        </div>
                    </section>
                </div>
            </main>
        </div>
    );

    return (
        <>
            <style>{`
                :root, [data-theme="light"] {
                    --primary-color: #4f46e5;
                    --primary-color-hover: #4338ca;
                    --secondary-color: #64748b;
                    --secondary-color-hover: #475569;
                    --danger-color: #ef4444;
                    --danger-color-hover: #dc2626;

                    --background-color: #f8fafc;
                    --surface-color: #ffffff;
                    --text-color: #0f172a;
                    --text-color-light: #64748b;
                    --border-color: #e2e8f0;
                    
                    --font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                    --border-radius: 8px;
                    --box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
                    --box-shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
                    color-scheme: light;
                }

                [data-theme="dark"] {
                    --primary-color: #6366f1;
                    --primary-color-hover: #818cf8;
                    --secondary-color: #94a3b8;
                    --secondary-color-hover: #cbd5e1;
                    --danger-color: #f87171;
                    --danger-color-hover: #ef4444;

                    --background-color: #0f172a;
                    --surface-color: #1e293b;
                    --text-color: #f1f5f9;
                    --text-color-light: #94a3b8;
                    --border-color: #334155;
                    color-scheme: dark;
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
                    transition: background-color 0.3s, color 0.3s;
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
                    /* Style moved to .invoice-form for better scoping */
                }
                .invoice-form {
                    display: grid;
                    gap: 24px;
                }
                .card {
                    background-color: var(--surface-color);
                    border-radius: var(--border-radius);
                    box-shadow: var(--box-shadow);
                    border: 1px solid var(--border-color);
                    padding: 24px;
                    transition: background-color 0.3s, border-color 0.3s;
                }
                h2 {
                    font-size: 1.25rem;
                    margin-top: 0;
                    margin-bottom: 16px;
                    font-weight: 600;
                    border-bottom: 1px solid var(--border-color);
                    padding-bottom: 12px;
                }
                label {
                    display: block;
                    margin-bottom: 8px;
                    font-weight: 500;
                    font-size: 0.875rem;
                    color: var(--text-color-light);
                }
                input[type="text"], input[type="number"], input[type="date"], input[type="file"], select {
                    width: 100%;
                    padding: 10px 12px;
                    background-color: var(--surface-color);
                    color: var(--text-color);
                    border: 1px solid var(--border-color);
                    border-radius: var(--border-radius);
                    font-size: 1rem;
                    font-family: inherit;
                    transition: border-color 0.2s, box-shadow 0.2s, background-color 0.3s;
                }
                input:focus, select:focus {
                    outline: none;
                    border-color: var(--primary-color);
                    box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary-color) 25%, transparent);
                }
                input[type="file"] {
                    padding: 8px;
                }
                .invoice-details {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                    gap: 16px;
                }
                .line-items-table-container {
                    overflow-x: auto;
                    margin: 0 -12px;
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
                    background-color: color-mix(in srgb, var(--background-color) 50%, transparent);
                    font-size: 0.75rem;
                    text-transform: uppercase;
                    color: var(--text-color-light);
                    font-weight: 600;
                    letter-spacing: 0.5px;
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
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    justify-content: center;
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
                    background-color: color-mix(in srgb, var(--border-color) 20%, var(--surface-color));
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
                .settings-form section {
                    margin-bottom: 32px;
                }
                 .settings-form section:last-child {
                    margin-bottom: 0;
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
