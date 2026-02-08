import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { collection, query, where, getDocs, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import './History.css';

const History = () => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState(null);
    const [editData, setEditData] = useState({});
    const [companies, setCompanies] = useState({});

    useEffect(() => {
        loadHistory();
    }, []);

    const loadHistory = async () => {
        try {
            const user = auth.currentUser;

            // Fetch requests
            const q = query(
                collection(db, 'ewasteRequests'),
                where('userId', '==', user.uid)
            );
            const querySnapshot = await getDocs(q);
            const historyData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            setRequests(historyData);

            // Fetch companies to map IDs to names
            const companySnapshot = await getDocs(collection(db, 'companies'));
            const companyMap = {};
            companySnapshot.docs.forEach(doc => {
                companyMap[doc.id] = doc.data().companyName || 'Unknown Company';
            });
            setCompanies(companyMap);

        } catch (error) {
            console.error('Error loading history:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this item?')) {
            try {
                await deleteDoc(doc(db, 'ewasteRequests', id));
                setRequests(requests.filter(req => req.id !== id));
            } catch (error) {
                console.error('Error deleting:', error);
                alert('Error deleting item');
            }
        }
    };

    const handleEdit = (request) => {
        setEditingId(request.id);
        setEditData({
            name: request.name,
            quantity: request.quantity,
            weight: request.weight,
            prize: request.prize
        });
    };

    const handleSaveEdit = async (id) => {
        try {
            await updateDoc(doc(db, 'ewasteRequests', id), editData);
            setRequests(requests.map(req =>
                req.id === id ? { ...req, ...editData } : req
            ));
            setEditingId(null);
        } catch (error) {
            console.error('Error updating:', error);
            alert('Error updating item');
        }
    };

    const getStatusText = (status) => {
        return status ? status.toUpperCase() : 'PENDING';
    };

    const getStatusClass = (status) => {
        switch (status) {
            case 'approved': return 'status-approved';
            case 'rejected': return 'status-rejected';
            default: return 'status-pending';
        }
    };

    if (loading) {
        return <div className="loading">Loading history...</div>;
    }

    return (
        <div className="history">
            <h2>Your E-Waste Submission History</h2>

            {requests.length === 0 ? (
                <div className="no-history">
                    <div className="no-history-icon">📋</div>
                    <p>No submissions yet.</p>
                    <p>Start by adding your first e-waste product!</p>
                </div>
            ) : (
                <div className="history-grid">
                    {requests.map((request) => (
                        <div key={request.id} className="history-card">
                            <div className="history-image">
                                {request.imageUrl ? (
                                    <img src={request.imageUrl} alt={request.name} />
                                ) : (
                                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f0f0', color: '#999' }}>No Image</div>
                                )}
                            </div>

                            <div className="history-details">
                                <h3>{request.name}</h3>

                                {editingId === request.id ? (
                                    <div className="edit-form">
                                        <input
                                            value={editData.name}
                                            onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                                            placeholder="Product Name"
                                        />
                                        <input
                                            value={editData.quantity}
                                            onChange={(e) => setEditData({ ...editData, quantity: e.target.value })}
                                            placeholder="Quantity"
                                            type="number"
                                        />
                                        <input
                                            value={editData.weight}
                                            onChange={(e) => setEditData({ ...editData, weight: e.target.value })}
                                            placeholder="Weight (kg)"
                                            type="number"
                                        />
                                        <div style={{ marginTop: '10px' }}>
                                            <button className="save-btn" onClick={() => handleSaveEdit(request.id)}>Save</button>
                                            <button className="cancel-btn" onClick={() => setEditingId(null)}>Cancel</button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="history-info">
                                            <p><strong>To:</strong> <span style={{ color: '#1e8449', fontWeight: 'bold' }}>{companies[request.companyId] || 'Loading...'}</span></p>
                                            <p><strong>Quantity:</strong> <span>{request.quantity}</span></p>
                                            <p><strong>Weight:</strong> <span>{request.weight} kg</span></p>
                                            <p><strong>Value:</strong> <span>₹{request.prize}</span></p>
                                            <p><strong>Value:</strong> <span>₹{request.prize}</span></p>
                                            <p><strong>Date:</strong> <span>{new Date(request.createdAt).toLocaleDateString()}</span></p>
                                            {request.agentName && (
                                                <div className="agent-details-history">
                                                    <p><strong>Assigned Agent:</strong> <span>{request.agentName}</span></p>
                                                    <p><strong>Agent Phone:</strong> <span>{request.agentPhone}</span></p>
                                                </div>
                                            )}
                                        </div>

                                        <div style={{ margin: '15px 0' }}>
                                            <span className={`status-badge ${getStatusClass(request.status)}`}>
                                                {getStatusText(request.status)}
                                            </span>
                                        </div>

                                        <div className="history-actions">
                                            <button className="edit-btn" onClick={() => handleEdit(request)} disabled={request.status === 'approved'}>
                                                ✏️ Edit
                                            </button>
                                            <button className="delete-btn" onClick={() => handleDelete(request.id)}>
                                                🗑️ Delete
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default History;
