import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { collection, query, where, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';
import './ViewRequests.css';

const ViewRequests = () => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [userDetails, setUserDetails] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [showPhotoModal, setShowPhotoModal] = useState(false);
    const [selectedPhoto, setSelectedPhoto] = useState(null);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [agentName, setAgentName] = useState('');
    const [agentPhone, setAgentPhone] = useState('');

    useEffect(() => {
        loadRequests();
    }, []);

    const loadRequests = async () => {
        try {
            const user = auth.currentUser;
            const q = query(
                collection(db, 'ewasteRequests'),
                where('companyId', '==', user.uid)
            );

            const querySnapshot = await getDocs(q);
            const requestsData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            setRequests(requestsData);
        } catch (error) {
            console.error('Error loading requests:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (requestId, newStatus) => {
        try {
            await updateDoc(doc(db, 'ewasteRequests', requestId), {
                status: newStatus
            });

            setRequests(requests.map(req =>
                req.id === requestId ? { ...req, status: newStatus } : req
            ));
        } catch (error) {
            console.error('Error updating status:', error);
            alert('Failed to update status');
        }
    };

    const viewDetails = async (request) => {
        try {
            const userDoc = await getDoc(doc(db, 'users', request.userId));
            if (userDoc.exists()) {
                setUserDetails(userDoc.data());
            } else {
                setUserDetails(null);
            }
            setSelectedRequest(request);
            setShowModal(true);
        } catch (error) {
            console.error('Error fetching user details:', error);
            alert('Failed to load user details');
        }
    };

    const closeModal = () => {
        setShowModal(false);
        setSelectedRequest(null);
        setUserDetails(null);
    };

    const viewPhoto = (imageUrl) => {
        setSelectedPhoto(imageUrl);
        setShowPhotoModal(true);
    };

    const closePhotoModal = () => {
        setShowPhotoModal(false);
        setSelectedPhoto(null);
    };

    const openAssignModal = (request) => {
        setSelectedRequest(request);
        setAgentName(request.agentName || '');
        setAgentPhone(request.agentPhone || '');
        setShowAssignModal(true);
    };

    const closeAssignModal = () => {
        setShowAssignModal(false);
        setSelectedRequest(null);
        setAgentName('');
        setAgentPhone('');
    };

    const handleAssignAgent = async () => {
        if (!agentName || !agentPhone) {
            alert('Please fill in both Agent Name and Phone');
            return;
        }

        try {
            await updateDoc(doc(db, 'ewasteRequests', selectedRequest.id), {
                status: 'assigned',
                agentName: agentName,
                agentPhone: agentPhone
            });

            setRequests(requests.map(req =>
                req.id === selectedRequest.id ? { ...req, status: 'assigned', agentName, agentPhone } : req
            ));

            closeAssignModal();
            alert('Agent assigned successfully!');
        } catch (error) {
            console.error('Error assigning agent:', error);
            alert('Failed to assign agent');
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'pending': return '#ffa500';
            case 'approved': return '#4caf50';
            case 'rejected': return '#f44336';
            case 'assigned': return '#2196f3';
            default: return '#999';
        }
    };

    const filteredRequests = filter === 'all'
        ? requests
        : requests.filter(req => req.status === filter);

    if (loading) {
        return <div className="loading">Loading requests...</div>;
    }

    return (
        <div className="view-requests">
            <div className="requests-header">
                <h2>E-Waste Collection Requests</h2>
                <div className="filter-buttons">
                    <button
                        className={filter === 'all' ? 'active' : ''}
                        onClick={() => setFilter('all')}
                    >
                        All ({requests.length})
                    </button>
                    <button
                        className={filter === 'pending' ? 'active' : ''}
                        onClick={() => setFilter('pending')}
                    >
                        Pending ({requests.filter(r => r.status === 'pending').length})
                    </button>
                    <button
                        className={filter === 'approved' ? 'active' : ''}
                        onClick={() => setFilter('approved')}
                    >
                        Approved ({requests.filter(r => r.status === 'approved').length})
                    </button>
                    <button
                        className={filter === 'rejected' ? 'active' : ''}
                        onClick={() => setFilter('rejected')}
                    >
                        Rejected ({requests.filter(r => r.status === 'rejected').length})
                    </button>
                    <button
                        className={filter === 'assigned' ? 'active' : ''}
                        onClick={() => setFilter('assigned')}
                    >
                        Assigned ({requests.filter(r => r.status === 'assigned').length})
                    </button>
                </div>
            </div>

            {filteredRequests.length === 0 ? (
                <div className="no-requests">
                    <p>No {filter !== 'all' ? filter : ''} requests found.</p>
                </div>
            ) : (
                <div className="requests-grid">
                    {filteredRequests.map((request) => (
                        <div key={request.id} className="request-card">
                            {request.imageUrl && (
                                <div className="request-image" onClick={() => viewPhoto(request.imageUrl)} style={{ cursor: 'pointer' }}>
                                    <img src={request.imageUrl} alt={request.name} />
                                    <div className="image-overlay">
                                        <span>🔍 Click to view</span>
                                    </div>
                                </div>
                            )}
                            <div className="request-details">
                                <h3>{request.name}</h3>
                                <div className="request-info">
                                    <p><strong>User:</strong> {request.userName || 'N/A'}</p>
                                    <p><strong>Quantity:</strong> {request.quantity}</p>
                                    <p><strong>Weight:</strong> {request.weight} kg</p>
                                    <p><strong>Prize:</strong> ₹{request.prize}</p>
                                    <p><strong>Date:</strong> {new Date(request.createdAt).toLocaleDateString()}</p>
                                    {request.agentName && (
                                        <div className="agent-info">
                                            <p><strong>Agent:</strong> {request.agentName}</p>
                                            <p><strong>Phone:</strong> {request.agentPhone}</p>
                                        </div>
                                    )}
                                </div>
                                <div className="request-status">
                                    <span
                                        className="status-badge"
                                        style={{ backgroundColor: getStatusColor(request.status) }}
                                    >
                                        {request.status || 'pending'}
                                    </span>
                                </div>
                                <button
                                    className="btn-view-details"
                                    onClick={() => viewDetails(request)}
                                >
                                    👁️ View Details
                                </button>
                                <div className="request-actions">
                                    <button
                                        className="btn-approve"
                                        onClick={() => handleStatusChange(request.id, 'approved')}
                                        disabled={request.status === 'approved'}
                                    >
                                        ✓ Approve
                                    </button>
                                    <button
                                        className="btn-reject"
                                        onClick={() => handleStatusChange(request.id, 'rejected')}
                                        disabled={request.status === 'rejected'}
                                    >
                                        ✗ Reject
                                    </button>
                                    <button
                                        className="btn-assign"
                                        onClick={() => openAssignModal(request)}
                                        disabled={request.status === 'rejected'}
                                    >
                                        👤 Assign Agent
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showModal && selectedRequest && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Request Details</h2>
                            <button className="modal-close" onClick={closeModal}>✕</button>
                        </div>
                        <div className="modal-body">
                            <div className="modal-grid">
                                <div className="modal-left">
                                    {selectedRequest.imageUrl && (
                                        <div className="modal-image-container">
                                            <img
                                                src={selectedRequest.imageUrl}
                                                alt={selectedRequest.name}
                                                className="modal-image"
                                                onClick={() => viewPhoto(selectedRequest.imageUrl)}
                                            />
                                            <button
                                                className="btn-view-photo"
                                                onClick={() => viewPhoto(selectedRequest.imageUrl)}
                                            >
                                                🔍 View Photo
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <div className="modal-right">
                                    <div className="detail-section">
                                        <h3>Product Information</h3>
                                        <p><strong>Product Name:</strong> {selectedRequest.name}</p>
                                        <p><strong>Quantity:</strong> {selectedRequest.quantity}</p>
                                        <p><strong>Weight:</strong> {selectedRequest.weight} kg</p>
                                        <p><strong>Prize:</strong> ₹{selectedRequest.prize}</p>
                                        <p><strong>Status:</strong> <span className="status-badge" style={{ backgroundColor: getStatusColor(selectedRequest.status) }}>{selectedRequest.status || 'pending'}</span></p>
                                        <p><strong>Submitted:</strong> {new Date(selectedRequest.createdAt).toLocaleDateString()} at {new Date(selectedRequest.createdAt).toLocaleTimeString()}</p>
                                    </div>
                                    {userDetails && (
                                        <div className="detail-section">
                                            <h3>User Information</h3>
                                            <p><strong>Name:</strong> {userDetails.username || 'N/A'}</p>
                                            <p><strong>Email:</strong> {userDetails.email || 'N/A'}</p>
                                            <p><strong>Mobile:</strong> {userDetails.mobile || 'N/A'}</p>
                                            <p><strong>Pickup Address:</strong> {selectedRequest.address || 'N/A'}</p>
                                            <p><strong>User ID:</strong> {selectedRequest.userId}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-modal-close" onClick={closeModal}>Close</button>
                        </div>
                    </div>
                </div>
            )}

            {showPhotoModal && selectedPhoto && (
                <div className="photo-modal-overlay" onClick={closePhotoModal}>
                    <div className="photo-modal-content">
                        <button className="photo-modal-close" onClick={closePhotoModal}>✕</button>
                        <img src={selectedPhoto} alt="Product" className="photo-modal-image" />
                    </div>
                </div>
            )}

            {showAssignModal && (
                <div className="modal-overlay" onClick={closeAssignModal}>
                    <div className="modal-content assign-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Assign Agent</h2>
                            <button className="modal-close" onClick={closeAssignModal}>✕</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label>Agent Name</label>
                                <input
                                    type="text"
                                    value={agentName}
                                    onChange={(e) => setAgentName(e.target.value)}
                                    placeholder="Enter agent name"
                                />
                            </div>
                            <div className="form-group">
                                <label>Agent Phone Number</label>
                                <input
                                    type="tel"
                                    value={agentPhone}
                                    onChange={(e) => setAgentPhone(e.target.value)}
                                    placeholder="Enter agent phone"
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-cancel" onClick={closeAssignModal}>Cancel</button>
                            <button className="btn-confirm" onClick={handleAssignAgent}>Assign Agent</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ViewRequests;
