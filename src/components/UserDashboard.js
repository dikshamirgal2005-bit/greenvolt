import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';
import { collection, query, where, getDocs, doc, getDoc, orderBy } from 'firebase/firestore';
import AddEwaste from './AddEwaste';
import FindingCenters from './FindingCenters';
import History from './History';
import LearnMore from './LearnMore';
import './UserDashboard.css';

const UserDashboard = () => {
    const [activeSection, setActiveSection] = useState('welcome');
    const [companies, setCompanies] = useState([]);
    const [ecoPoints, setEcoPoints] = useState(0);
    const [userProfile, setUserProfile] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    // Initialize read notifications from local storage
    const [readNotifIds, setReadNotifIds] = useState(() => {
        const saved = localStorage.getItem('readNotifications');
        return saved ? JSON.parse(saved) : [];
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch companies
                const querySnapshot = await getDocs(collection(db, 'companies'));
                const companyData = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setCompanies(companyData);

                // Fetch user eco-points and profile
                const user = auth.currentUser;
                if (user) {
                    const userDocRef = doc(db, 'users', user.uid);
                    const userDocSnap = await getDoc(userDocRef);
                    if (userDocSnap.exists()) {
                        const userData = userDocSnap.data();
                        setEcoPoints(userData.ecoPoints || 0);
                        setUserProfile(userData);
                    }

                    // Fetch notifications (requests with status updates)
                    // Removing orderBy temporarily to avoid index issues if not created
                    const q = query(
                        collection(db, 'ewasteRequests'),
                        where('userId', '==', user.uid)
                    );
                    const requestSnapshot = await getDocs(q);
                    const allRequests = requestSnapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));

                    const notifs = allRequests.filter(req =>
                        ['approved', 'rejected', 'assigned'].includes(req.status) &&
                        !readNotifIds.includes(req.id)
                    );

                    setNotifications(notifs);
                    setUnreadCount(notifs.length);
                }
            } catch (error) {
                console.error("Error fetching data:", error);
            }
        };

        fetchData();
    }, [activeSection]);

    const handleLogout = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    const markAsRead = (id) => {
        const newReadIds = [...readNotifIds, id];
        setReadNotifIds(newReadIds);
        localStorage.setItem('readNotifications', JSON.stringify(newReadIds));

        const updatedNotifs = notifications.filter(n => n.id !== id);
        setNotifications(updatedNotifs);
        setUnreadCount(updatedNotifs.length);
    };

    const clearAllNotifications = (e) => {
        if (e && e.stopPropagation) e.stopPropagation();
        const allIds = [...readNotifIds, ...notifications.map(n => n.id)];
        setReadNotifIds(allIds);
        localStorage.setItem('readNotifications', JSON.stringify(allIds));

        setNotifications([]);
        setUnreadCount(0);
    };

    const user = auth.currentUser;
    const username = user?.email?.split('@')[0] || 'User';
    const displayName = userProfile?.username || user?.displayName || username;
    const userEmail = userProfile?.email || user?.email;
    const userMobile = userProfile?.mobile || 'Not provided';

    return (
        <div className="dashboard">
            <nav className="dashboard-nav">
                <div className="nav-left">
                    <h1 onClick={() => setActiveSection('welcome')} style={{ cursor: 'pointer' }}>
                        ♻️ E-Waste Management
                    </h1>
                </div>
                <div className="nav-right">
                    <div className="eco-points">
                        <span className="points-icon">🌿</span>
                        <span className="points-text">Eco Points: {ecoPoints}</span>
                    </div>

                    <div className="notification-container">
                        <div className="bell-icon" onClick={() => setShowNotifications(!showNotifications)}>
                            🔔
                            {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
                        </div>
                        {showNotifications && (
                            <div className="notification-dropdown">
                                <div className="notification-header-row">
                                    <h3>Notifications</h3>
                                    {notifications.length > 0 && (
                                        <button className="clear-all-btn" onClick={clearAllNotifications}>
                                            Clear All
                                        </button>
                                    )}
                                </div>
                                {notifications.length === 0 ? (
                                    <p className="no-notifications">No notifications yet</p>
                                ) : (
                                    <div className="notification-list">
                                        {notifications.map(notif => (
                                            <div
                                                key={notif.id}
                                                className={`notification-item ${notif.status}`}
                                                onClick={() => markAsRead(notif.id)}
                                            >
                                                <div className="notif-header">
                                                    <span className="notif-title">{notif.fullName || "Request"}</span>
                                                    <span className="notif-time">
                                                        {notif.createdAt ? new Date(notif.createdAt.seconds * 1000).toLocaleDateString() : ""}
                                                    </span>
                                                </div>
                                                <p className="notif-message">
                                                    Status: <strong style={{ color: notif.status === 'approved' ? '#4caf50' : notif.status === 'rejected' ? '#f44336' : '#2196f3' }}>
                                                        {notif.status.toUpperCase()}
                                                    </strong>
                                                </p>
                                                {notif.status === 'assigned' && (
                                                    <p className="notif-detail">
                                                        Agent <strong>{notif.agentName}</strong> has been assigned to collect your e-waste.
                                                    </p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="user-avatar">
                        <span className="avatar-circle">{username.charAt(0).toUpperCase()}</span>
                        <span className="username">{username}</span>
                    </div>
                    <button className="logout-btn" onClick={handleLogout}>Logout</button>
                </div>
            </nav>

            <div className="dashboard-content">
                {activeSection !== 'welcome' && (
                    <button className="back-btn" onClick={() => setActiveSection('welcome')}>
                        ← Back to Dashboard
                    </button>
                )}

                {activeSection === 'welcome' ? (
                    <div className="welcome-section-container">
                        <div className="welcome-section">
                            <h2>Welcome, {displayName}! 👋</h2>
                            <p>Manage your e-waste responsibly and earn eco points!</p>
                        </div>

                        {/* Profile Banner Section */}
                        <div className="profile-banner">
                            <div className="profile-header-large">
                                <div className="profile-avatar-large">
                                    {username.charAt(0).toUpperCase()}
                                </div>
                                <div className="profile-info-large">
                                    <h3>My Profile</h3>
                                    <div className="profile-grid">
                                        <div className="profile-item">
                                            <span className="label">Name:</span>
                                            <span className="value">{displayName}</span>
                                        </div>
                                        <div className="profile-item">
                                            <span className="label">Email:</span>
                                            <span className="value">{userEmail}</span>
                                        </div>
                                        <div className="profile-item">
                                            <span className="label">Mobile:</span>
                                            <span className="value">{userMobile}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="feature-boxes">
                            <div className="feature-box" onClick={() => setActiveSection('add-ewaste')}>
                                <div className="feature-icon">📱</div>
                                <h3>Add E-Waste Product</h3>
                                <p>Upload your e-waste items</p>
                            </div>

                            <div className="feature-box" onClick={() => setActiveSection('finding-centers')}>
                                <div className="feature-icon">📍</div>
                                <h3>Finding Centers</h3>
                                <p>Locate nearby collection centers</p>
                            </div>

                            <div className="feature-box" onClick={() => setActiveSection('history')}>
                                <div className="feature-icon">📋</div>
                                <h3>History</h3>
                                <p>View your submission history</p>
                            </div>

                            <div className="feature-box" onClick={() => setActiveSection('learn-more')}>
                                <div className="feature-icon">📚</div>
                                <h3>Guidelines</h3>
                                <p>E-waste guidelines & tips</p>
                            </div>
                        </div>
                    </div>
                ) : activeSection === 'add-ewaste' ? (
                    <AddEwaste companies={companies} onSuccess={() => setActiveSection('history')} />
                ) : activeSection === 'finding-centers' ? (
                    <FindingCenters />
                ) : activeSection === 'history' ? (
                    <History />
                ) : activeSection === 'learn-more' ? (
                    <LearnMore />
                ) : null}
            </div>
        </div>
    );
};

export default UserDashboard;
