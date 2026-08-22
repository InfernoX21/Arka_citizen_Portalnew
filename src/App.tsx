import React, { useEffect, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { BottomNav } from './components/BottomNav';
import { Header } from './components/Header';
import { IncidentCard } from './components/IncidentCard';
import { IncidentDetailModal } from './components/IncidentDetailModal';
import { LoginPage } from './components/LoginPage';
import { AdminLoginPage } from './components/AdminLoginPage';
import { NotificationsView } from './components/NotificationsView';
import { ReportModal } from './components/ReportModal';
import { SearchFilterBar } from './components/SearchFilterBar';
import { UserProfileModal } from './components/UserProfileModal';
import {
  getStoredComments,
  getStoredIncidents,
  getStoredNotifications,
  getStoredUserProfile,
  saveComments,
  saveIncidents,
  saveNotifications,
  saveUserProfile,
} from './lib/storage';
import { AuthMethod, IncidentComment, IncidentReport, NotificationItem, UserProfile } from './types';

const AUTH_STORAGE_KEY = 'arka_auth_v1';

function getStoredAuth(): boolean {
  try {
    return localStorage.getItem(AUTH_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export default function App() {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(getStoredAuth);
  const [authPortalMode, setAuthPortalMode] = useState<'citizen' | 'admin'>('citizen');

  // Dark Mode State
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('arka_theme') === 'dark' || true;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('arka_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('arka_theme', 'light');
    }
  }, [darkMode]);

  // Tab & User State
  const [activeTab, setActiveTab] = useState<'home' | 'notifications'>('home');
  const [user, setUser] = useState<UserProfile>(getStoredUserProfile);

  // Data Collections
  const [incidents, setIncidents] = useState<IncidentReport[]>(getStoredIncidents);
  const [commentsMap, setCommentsMap] = useState<Record<string, IncidentComment[]>>(getStoredComments);
  const [notifications, setNotifications] = useState<NotificationItem[]>(getStoredNotifications);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<any>('All');
  const [sortBy, setSortBy] = useState<'latest' | 'nearby' | 'verified' | 'trending'>('latest');
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [activeStatusFilter, setActiveStatusFilter] = useState<'all' | 'Active' | 'Under Review' | 'Resolved'>('all');

  // Modals
  const [selectedIncident, setSelectedIncident] = useState<IncidentReport | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Toast message
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Persist State Updates
  useEffect(() => {
    saveIncidents(incidents);
  }, [incidents]);

  useEffect(() => {
    saveComments(commentsMap);
  }, [commentsMap]);

  useEffect(() => {
    saveNotifications(notifications);
  }, [notifications]);

  useEffect(() => {
    saveUserProfile(user);
  }, [user]);

  // Login handler
  const handleLogin = (loginData: {
    name: string;
    email?: string;
    authMethod: AuthMethod;
    avatar: string;
  }) => {
    const updatedUser: UserProfile = {
      ...user,
      id: `user_${Date.now()}`,
      name: loginData.name,
      email: loginData.email || user.email,
      authMethod: loginData.authMethod,
      avatar: loginData.avatar,
      joinDate: new Date().toISOString(),
    };
    setUser(updatedUser);
    saveUserProfile(updatedUser);
    setIsAuthenticated(true);
    localStorage.setItem(AUTH_STORAGE_KEY, 'true');
  };

  // Admin Login handler
  const handleAdminLogin = (adminData: Partial<UserProfile>) => {
    const updatedUser: UserProfile = {
      ...user,
      ...adminData,
      id: adminData.id || `admin_${Date.now()}`,
      name: adminData.name || 'Municipal Admin',
      email: adminData.email || 'admin@arka.gov.in',
      role: 'admin',
      trustScore: 100,
      avatar: adminData.avatar || user.avatar,
      joinDate: new Date().toISOString(),
    };
    setUser(updatedUser);
    saveUserProfile(updatedUser);
    setIsAuthenticated(true);
    localStorage.setItem(AUTH_STORAGE_KEY, 'true');
    showToast(`🛡️ Authenticated as ${updatedUser.name} (Admin Clearance Granted)`);
  };

  // Logout handler (can be wired to profile modal later)
  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  };

  // Show login page if not authenticated
  if (!isAuthenticated) {
    if (authPortalMode === 'admin') {
      return (
        <AdminLoginPage
          onAdminLogin={handleAdminLogin}
          onSwitchToCitizen={() => setAuthPortalMode('citizen')}
        />
      );
    }
    return (
      <LoginPage
        onLogin={handleLogin}
        onSwitchToAdmin={() => setAuthPortalMode('admin')}
      />
    );
  }

  // Handler: Upvote (Confirm)
  const handleUpvote = (id: string) => {
    setIncidents((prev) =>
      prev.map((inc) => {
        if (inc.id !== id) return inc;
        const alreadyUpvoted = inc.upvotes.includes(user.id);
        const newUpvotes = alreadyUpvoted
          ? inc.upvotes.filter((uid) => uid !== user.id)
          : [...inc.upvotes, user.id];
        const newDownvotes = inc.downvotes.filter((uid) => uid !== user.id);

        const netScore = newUpvotes.length - newDownvotes.length;

        return {
          ...inc,
          upvotes: newUpvotes,
          downvotes: newDownvotes,
          verificationCount: netScore,
        };
      })
    );
    showToast('Verification confirmed!');
  };

  // Handler: Downvote (Dispute)
  const handleDownvote = (id: string) => {
    setIncidents((prev) =>
      prev.map((inc) => {
        if (inc.id !== id) return inc;
        const alreadyDownvoted = inc.downvotes.includes(user.id);
        const newDownvotes = alreadyDownvoted
          ? inc.downvotes.filter((uid) => uid !== user.id)
          : [...inc.downvotes, user.id];
        const newUpvotes = inc.upvotes.filter((uid) => uid !== user.id);

        const netScore = newUpvotes.length - newDownvotes.length;

        return {
          ...inc,
          upvotes: newUpvotes,
          downvotes: newDownvotes,
          verificationCount: netScore,
        };
      })
    );
    showToast('Report dispute logged.');
  };

  // Handler: Toggle Save
  const handleToggleSave = (id: string) => {
    setIncidents((prev) =>
      prev.map((inc) => {
        if (inc.id !== id) return inc;
        const isSaved = !inc.isSaved;
        showToast(isSaved ? 'Incident saved to bookmarks' : 'Removed from bookmarks');
        return { ...inc, isSaved };
      })
    );
  };

  // Handler: Add Comment
  const handleAddComment = (incidentId: string, content: string, isConfirm: boolean) => {
    const newComment: IncidentComment = {
      id: `cmt_${Date.now()}`,
      incidentId,
      author: {
        id: user.id,
        name: user.name,
        avatar: user.avatar,
        trustScore: user.trustScore,
      },
      content,
      createdAt: new Date().toISOString(),
      isVerificationConfirm: isConfirm,
    };

    setCommentsMap((prev) => ({
      ...prev,
      [incidentId]: [...(prev[incidentId] || []), newComment],
    }));

    setIncidents((prev) =>
      prev.map((inc) => (inc.id === incidentId ? { ...inc, commentsCount: inc.commentsCount + 1 } : inc))
    );

    showToast('Comment & update posted!');
  };

  // Handler: Resolve Incident
  const handleResolveIncident = (incidentId: string) => {
    setIncidents((prev) =>
      prev.map((inc) => {
        if (inc.id !== incidentId) return inc;
        return {
          ...inc,
          status: 'Resolved',
          resolvedBy: {
            id: user.id,
            name: user.name,
            timestamp: new Date().toISOString(),
          },
        };
      })
    );

    // Boost trust score
    setUser((prev) => ({
      ...prev,
      trustScore: Math.min(100, prev.trustScore + 5),
    }));

    showToast('Incident marked as RESOLVED! (+5 Trust Points)');
  };

  // Handler: Submit New Incident Report
  const handleSubmitNewReport = (newReportData: any) => {
    const newInc: IncidentReport = {
      ...newReportData,
      id: `inc_${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      reporter: {
        id: user.id,
        name: user.name,
        avatar: user.avatar,
        trustScore: user.trustScore,
      },
      upvotes: [user.id],
      downvotes: [],
      verificationCount: 1,
      commentsCount: 0,
    };

    setIncidents((prev) => [newInc, ...prev]);

    // Update user stats
    setUser((prev) => ({
      ...prev,
      totalReports: prev.totalReports + 1,
      trustScore: Math.min(100, prev.trustScore + 10),
    }));

    // Add notification
    const newNotif: NotificationItem = {
      id: `notif_${Date.now()}`,
      userId: user.id,
      type: 'verified',
      title: 'Report Published (+10 Trust Points)',
      message: `Your report "${newInc.aiTitle}" is now live on the Arka community feed!`,
      incidentId: newInc.id,
      timestamp: new Date().toISOString(),
      isRead: false,
      trustDelta: 10,
    };

    setNotifications((prev) => [newNotif, ...prev]);

    showToast('🎉 Report published successfully!');
  };

  // Handler: Merge Report with Existing Duplicate
  const handleMergeWithExisting = (duplicateId: string) => {
    setIncidents((prev) =>
      prev.map((inc) => {
        if (inc.id !== duplicateId) return inc;
        const newDupCount = inc.duplicateCount + 1;
        const mergedList = inc.mergedReporters || [];
        return {
          ...inc,
          duplicateCount: newDupCount,
          upvotes: [...inc.upvotes, user.id],
          verificationCount: inc.verificationCount + 1,
          mergedReporters: [
            ...mergedList,
            { name: user.name, avatar: user.avatar, trustScore: user.trustScore },
          ],
        };
      })
    );

    showToast('Report merged with existing citizen incident!');
  };

  // Share link handler
  const handleShare = (incident: IncidentReport) => {
    if (navigator.share) {
      navigator
        .share({
          title: incident.aiTitle,
          text: `${incident.aiTitle} - Reported on Arka Incident Portal`,
          url: window.location.href,
        })
        .catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      showToast('Incident link copied to clipboard!');
    }
  };

  // Delete Incident Report Handler
  const handleDeleteIncident = (incidentId: string) => {
    try {
      setIncidents((prev) => {
        const updated = prev.filter((inc) => inc.id !== incidentId);
        saveIncidents(updated);
        return updated;
      });

      // Remove related comments
      setCommentsMap((prev) => {
        const updated = { ...prev };
        delete updated[incidentId];
        saveComments(updated);
        return updated;
      });

      // Close modal if open
      if (selectedIncident?.id === incidentId) {
        setSelectedIncident(null);
      }

      showToast('🗑️ Report permanently deleted');
    } catch (err: any) {
      console.error('Delete incident error:', err);
      showToast('Failed to delete report. Please try again.');
    }
  };

  // Filter & Search Logic
  const filteredIncidents = incidents
    .filter((inc) => {
      // Category Filter
      if (selectedCategory !== 'All' && inc.category !== selectedCategory) return false;

      // Status Filter
      if (activeStatusFilter !== 'all' && inc.status !== activeStatusFilter) return false;

      // Saved Filter
      if (showSavedOnly && !inc.isSaved) return false;

      // Search Query Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = inc.aiTitle.toLowerCase().includes(q);
        const matchesDesc = inc.userDescription.toLowerCase().includes(q);
        const matchesCat = inc.category.toLowerCase().includes(q);
        const matchesLoc = inc.locationName.toLowerCase().includes(q);
        const matchesKw = inc.keywords.some((k) => k.toLowerCase().includes(q));
        return matchesTitle || matchesDesc || matchesCat || matchesLoc || matchesKw;
      }

      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'verified') return b.verificationCount - a.verificationCount;
      if (sortBy === 'trending') return (b.commentsCount + b.verificationCount) - (a.commentsCount + a.verificationCount);
      // default 'latest'
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const unreadNotifCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="min-h-screen bg-zinc-100/70 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans transition-colors pb-20">
      {/* Header */}
      <Header
        user={user}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        unreadNotificationsCount={unreadNotifCount}
      />

      {/* Main Container */}
      <main className="max-w-xl mx-auto px-3 sm:px-4 pt-4">
        {/* Toast Notification Popup */}
        <AnimatePresence>
          {toastMessage && (
            <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-bold shadow-xl border border-orange-500/30 flex items-center space-x-2 animate-bounce">
              <span>{toastMessage}</span>
            </div>
          )}
        </AnimatePresence>

        {activeTab === 'home' && (
          <div>
            {/* Search and Filters */}
            <SearchFilterBar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
              sortBy={sortBy}
              onChangeSortBy={setSortBy}
              showSavedOnly={showSavedOnly}
              onToggleSavedOnly={() => setShowSavedOnly(!showSavedOnly)}
              activeStatusFilter={activeStatusFilter}
              onSelectStatusFilter={setActiveStatusFilter}
            />

            {/* Live Feed List */}
            <div className="space-y-4">
              {filteredIncidents.length === 0 ? (
                <div className="text-center py-16 space-y-3 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8">
                  <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                    🔍
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      No incidents match your current filter
                    </h3>
                    <p className="text-xs text-slate-500">
                      Try clearing filters or search term to discover more community reports.
                    </p>
                  </div>
                </div>
              ) : (
                filteredIncidents.map((incident) => (
                  <IncidentCard
                    key={incident.id}
                    incident={incident}
                    currentUserId={user.id}
                    onUpvote={handleUpvote}
                    onDownvote={handleDownvote}
                    onToggleSave={handleToggleSave}
                    onOpenDetail={(inc) => setSelectedIncident(inc)}
                    onShare={handleShare}
                    onDelete={handleDeleteIncident}
                  />
                ))
              )}
            </div>
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <NotificationsView
            notifications={notifications}
            onMarkAllAsRead={() => {
              setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
              showToast('All notifications marked as read');
            }}
            onNotificationClick={(incidentId) => {
              if (incidentId) {
                const match = incidents.find((i) => i.id === incidentId);
                if (match) {
                  setSelectedIncident(match);
                }
              }
            }}
          />
        )}
      </main>

      {/* Modals */}
      {selectedIncident && (
        <IncidentDetailModal
          incident={selectedIncident}
          comments={commentsMap[selectedIncident.id] || []}
          currentUser={user}
          onClose={() => setSelectedIncident(null)}
          onAddComment={handleAddComment}
          onResolveIncident={handleResolveIncident}
          onUpvote={handleUpvote}
          onDelete={handleDeleteIncident}
        />
      )}

      {isReportModalOpen && (
        <ReportModal
          onClose={() => setIsReportModalOpen(false)}
          onSubmitReport={handleSubmitNewReport}
          onMergeWithExisting={handleMergeWithExisting}
          existingIncidents={incidents}
        />
      )}

      {isProfileModalOpen && (
        <UserProfileModal
          user={user}
          userReports={incidents.filter((i) => i.reporter.id === user.id)}
          savedReports={incidents.filter((i) => i.isSaved)}
          onClose={() => setIsProfileModalOpen(false)}
          onUpdateAuthMethod={(method: AuthMethod) => {
            setUser((prev) => ({ ...prev, authMethod: method }));
            showToast(`Auth method updated to ${method.toUpperCase()}`);
          }}
          onOpenDetail={(inc) => setSelectedIncident(inc)}
          onLogout={handleLogout}
        />
      )}

      {/* Bottom Navigation Bar */}
      <BottomNav
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenReportModal={() => setIsReportModalOpen(true)}
        unreadNotificationsCount={unreadNotifCount}
      />
    </div>
  );
}
