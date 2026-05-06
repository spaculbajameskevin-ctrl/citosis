(() => {
  const PAGE_TITLES = {
    dashboard: 'Dashboard',
    'incoming-data': 'Incoming Data',
    'request-data': 'Request Data',
    'request-history': 'Request History',
    template: 'Template',
    'send-data': 'Send Data',
    'sent-data': 'Sent Data',
    records: 'Data Received',
    visitors: 'Visitors',
    users: 'Users',
    recycle: 'Recycle Bin',
    logs: 'Activity Logs',
  };

  const INCOMING_DATA_PRESET_PENDING_THIS_WEEK = 'pending_this_week';
  const INCOMING_DATA_REALTIME_POLL_INTERVAL_MS = 15000;
  const APP_AUTO_REFRESH_INTERVAL_MS = 20000;
  const ROLE_LEGACY_MAP = {
    Admin: 'Super Admin',
    Manager: 'Reviewer',
    Encoder: 'Reviewer',
    Staff: 'User',
  };
  const ADMIN_DASHBOARD_ROLES = new Set(['Super Admin', 'Reviewer', 'Viewer']);
  const DATA_EDITOR_ROLES = new Set(['Super Admin', 'Reviewer']);
  const DELETE_ROLES = new Set(['Super Admin']);
  const AUTH_TOKEN_KEY = 'citosis_token';
  const AUTH_USER_KEY = 'citosis_user';
  const DATA_UPDATE_SIGNAL_KEY = 'citosis_data_update_signal';
  const establishmentOptions = readJsonScript('establishment-options-data');

  const state = {
    token: null,
    user: null,
    pendingTwoFactorChallengeId: '',
    pendingTwoFactorMaskedEmail: '',
    pendingTwoFactorRemember: true,
    dashboard: null,
    excelPreview: null,
    dataSubmissions: [],
    notifications: [],
    dataRequestTargets: [],
    dataRequestHistory: [],
    incomingDataSelectedIds: [],
    incomingDataBatchProcessing: false,
    incomingDataSavedFilters: [],
    incomingDataActiveSavedFilterId: '',
    incomingDataRealtimeTimer: null,
    incomingDataRealtimePollInFlight: false,
    appAutoRefreshTimer: null,
    appAutoRefreshInFlight: false,
    sendDataFiles: [],
    sendDataActiveFileId: null,
    sendDataFile: null,
    sendDataPreview: null,
    sendDataSelectedSheets: [],
    sendDataSheetConfigs: {},
    records: [],
    visitors: [],
    users: [],
    recycle: [],
    logs: [],
    currentPage: 'dashboard',
    confirmHandler: null,
  };

  const dom = {};

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    cacheDom();
    bindEvents();
    loadTheme();
    startClock();
    restoreSession();
  }

  function cacheDom() {
    dom.body = document.body;
    dom.loginPage = document.getElementById('loginPage');
    dom.app = document.getElementById('app');
    dom.loginForm = document.getElementById('loginForm');
    dom.loginError = document.getElementById('loginError');
    dom.registerForm = document.getElementById('registerForm');
    dom.registerError = document.getElementById('registerError');
    dom.registerSuccess = document.getElementById('registerSuccess');
    dom.registerName = document.getElementById('registerName');
    dom.registerEmail = document.getElementById('registerEmail');
    dom.registerOffice = document.getElementById('registerOffice');
    dom.registerPassword = document.getElementById('registerPassword');
    dom.registerPasswordConfirm = document.getElementById('registerPasswordConfirm');
    dom.forgotPasswordForm = document.getElementById('forgotPasswordForm');
    dom.forgotPasswordEmail = document.getElementById('forgotPasswordEmail');
    dom.forgotPasswordError = document.getElementById('forgotPasswordError');
    dom.forgotPasswordSuccess = document.getElementById('forgotPasswordSuccess');
    dom.twoFactorForm = document.getElementById('twoFactorForm');
    dom.twoFactorCode = document.getElementById('twoFactorCode');
    dom.twoFactorError = document.getElementById('twoFactorError');
    dom.twoFactorSuccess = document.getElementById('twoFactorSuccess');
    dom.twoFactorSubtext = document.getElementById('twoFactorSubtext');
    dom.passwordInput = document.getElementById('password');
    dom.togglePasswordBtn = document.getElementById('togglePasswordBtn');
    dom.preLoginThemeBtn = document.getElementById('preLoginThemeBtn');
    dom.accountChip = document.getElementById('accountChip');
    dom.accountAvatar = document.getElementById('accountAvatar');
    dom.accountName = document.getElementById('accountName');
    dom.accountIdentifier = document.getElementById('accountIdentifier');
    dom.sidebarAccount = document.getElementById('sidebarAccount');
    dom.sidebarAccountAvatar = document.getElementById('sidebarAccountAvatar');
    dom.sidebarAccountName = document.getElementById('sidebarAccountName');
    dom.sidebarAccountRole = document.getElementById('sidebarAccountRole');
    dom.sidebarAccountMeta = document.getElementById('sidebarAccountMeta');
    dom.sidebarAccountEmail = document.getElementById('sidebarAccountEmail');
    dom.showLoginBtn = document.getElementById('showLoginBtn');
    dom.showRegisterBtn = document.getElementById('showRegisterBtn');
    dom.showForgotPasswordBtn = document.getElementById('showForgotPasswordBtn');
    dom.backToLoginFromHelpBtn = document.getElementById('backToLoginFromHelpBtn');
    dom.backToLoginFromTwoFactorBtn = document.getElementById('backToLoginFromTwoFactorBtn');
    dom.resendVerificationBtn = document.getElementById('resendVerificationBtn');
    dom.resendTwoFactorBtn = document.getElementById('resendTwoFactorBtn');
    dom.loginView = document.getElementById('loginView');
    dom.registerView = document.getElementById('registerView');
    dom.forgotPasswordView = document.getElementById('forgotPasswordView');
    dom.twoFactorView = document.getElementById('twoFactorView');
    dom.themeBtn = document.getElementById('themeBtn');
    dom.pageTitle = document.getElementById('pageTitle');
    dom.clockText = document.getElementById('clockText');
    dom.sidebar = document.getElementById('sidebar');
    dom.sidebarOverlay = document.getElementById('sidebarOverlay');
    dom.menuBtn = document.getElementById('menuBtn');
    dom.globalSearch = document.getElementById('globalSearch');
    dom.notificationBtn = document.getElementById('notificationBtn');
    dom.notificationBadge = document.getElementById('notificationBadge');
    dom.notificationPanel = document.getElementById('notificationPanel');
    dom.notificationList = document.getElementById('notificationList');
    dom.markAllNotificationsReadBtn = document.getElementById('markAllNotificationsReadBtn');
    dom.navButtons = Array.from(document.querySelectorAll('.nav-btn'));
    dom.pages = Array.from(document.querySelectorAll('.page'));
    dom.toastWrap = document.getElementById('toastWrap');

    dom.modalBackdrop = document.getElementById('modalBackdrop');
    dom.modalTitle = document.getElementById('modalTitle');
    dom.modalSubtitle = document.getElementById('modalSubtitle');
    dom.modalBody = document.getElementById('modalBody');
    dom.closeModalBtn = document.getElementById('closeModalBtn');
    dom.cancelModalBtn = document.getElementById('cancelModalBtn');
    dom.entityForm = document.getElementById('entityForm');
    dom.saveModalBtn = document.getElementById('saveModalBtn');

    dom.confirmBackdrop = document.getElementById('confirmBackdrop');
    dom.confirmTitle = document.getElementById('confirmTitle');
    dom.confirmSubtitle = document.getElementById('confirmSubtitle');
    dom.confirmContent = document.getElementById('confirmContent');
    dom.confirmActionBtn = document.getElementById('confirmActionBtn');
    dom.confirmCancelBtn = document.getElementById('confirmCancelBtn');
    dom.closeConfirmBtn = document.getElementById('closeConfirmBtn');

    dom.logoutSidebarBtn = document.getElementById('logoutSidebarBtn');
    dom.logoutTopBtn = document.getElementById('logoutTopBtn');

    dom.addRecordBtn = document.getElementById('addRecordBtn');
    dom.addVisitorBtn = document.getElementById('addVisitorBtn');
    dom.exportVisitorsExcelBtn = document.getElementById('exportVisitorsExcelBtn');
    dom.addUserBtn = document.getElementById('addUserBtn');
    dom.emptyRecycleBtn = document.getElementById('emptyRecycleBtn');
    dom.exportLogsBtn = document.getElementById('exportLogsBtn');
    dom.clearLogsBtn = document.getElementById('clearLogsBtn');

    dom.badgeRecords = document.getElementById('badgeRecords');
    dom.badgeIncomingData = document.getElementById('badgeIncomingData');
    dom.badgeRequestHistory = document.getElementById('badgeRequestHistory');
    dom.badgeSentData = document.getElementById('badgeSentData');
    dom.badgeVisitors = document.getElementById('badgeVisitors');
    dom.badgeUsers = document.getElementById('badgeUsers');
    dom.badgeRecycle = document.getElementById('badgeRecycle');

    dom.recordSearch = document.getElementById('recordSearch');
    dom.recordCategoryFilter = document.getElementById('recordCategoryFilter');
    dom.clearRecordFilters = document.getElementById('clearRecordFilters');
    dom.recordTable = document.getElementById('recordTable');
    dom.receivedDataSearch = document.getElementById('receivedDataSearch');
    dom.receivedDataEstablishmentFilter = document.getElementById('receivedDataEstablishmentFilter');
    dom.receivedDataStatusFilter = document.getElementById('receivedDataStatusFilter');
    dom.clearReceivedDataFilters = document.getElementById('clearReceivedDataFilters');
    dom.receivedDataCount = document.getElementById('receivedDataCount');
    dom.receivedDataList = document.getElementById('receivedDataList');

    dom.visitorSearch = document.getElementById('visitorSearch');
    dom.visitorStatusFilter = document.getElementById('visitorStatusFilter');
    dom.clearVisitorFilters = document.getElementById('clearVisitorFilters');
    dom.visitorTable = document.getElementById('visitorTable');

    dom.userSearch = document.getElementById('userSearch');
    dom.userRoleFilter = document.getElementById('userRoleFilter');
    dom.userStatusFilter = document.getElementById('userStatusFilter');
    dom.clearUserFilters = document.getElementById('clearUserFilters');
    dom.userTable = document.getElementById('userTable');

    dom.recycleSearch = document.getElementById('recycleSearch');
    dom.recycleTypeFilter = document.getElementById('recycleTypeFilter');
    dom.clearRecycleFilters = document.getElementById('clearRecycleFilters');
    dom.recycleTable = document.getElementById('recycleTable');

    dom.logSearch = document.getElementById('logSearch');
    dom.logLimitFilter = document.getElementById('logLimitFilter');
    dom.clearLogSearch = document.getElementById('clearLogSearch');
    dom.logsList = document.getElementById('logsList');
    dom.dataRequestPageForm = document.getElementById('dataRequestPageForm');
    dom.pageDataRequestEstablishments = document.getElementById('pageDataRequestEstablishments');
    dom.pageDataRequestTitle = document.getElementById('pageDataRequestTitle');
    dom.pageDataRequestDueDate = document.getElementById('pageDataRequestDueDate');
    dom.pageDataRequestMessage = document.getElementById('pageDataRequestMessage');
    dom.dataRequestPageStatus = document.getElementById('dataRequestPageStatus');
    dom.sendDataRequestPageBtn = document.getElementById('sendDataRequestPageBtn');
    dom.refreshDataRequestTargetsBtn = document.getElementById('refreshDataRequestTargetsBtn');

    dom.statRecords = document.getElementById('statRecords');
    dom.statVisitors = document.getElementById('statVisitors');
    dom.statUsers = document.getElementById('statUsers');
    dom.statRecycle = document.getElementById('statRecycle');
    dom.statRecordsMeta = document.getElementById('statRecordsMeta');
    dom.statVisitorsMeta = document.getElementById('statVisitorsMeta');
    dom.statUsersMeta = document.getElementById('statUsersMeta');
    dom.statRecycleMeta = document.getElementById('statRecycleMeta');
    dom.adminIntelligenceSection = document.getElementById('adminIntelligenceSection');
    dom.adminMetricsGrid = document.getElementById('adminMetricsGrid');
    dom.submissionsTrendChart = document.getElementById('submissionsTrendChart');
    dom.visitorsGrowthChart = document.getElementById('visitorsGrowthChart');
    dom.destinationsTrendChart = document.getElementById('destinationsTrendChart');
    dom.destinationBars = document.getElementById('destinationBars');
    dom.activityFeed = document.getElementById('activityFeed');
    dom.recentRecords = document.getElementById('recentRecords');
    dom.summaryList = document.getElementById('summaryList');
    dom.incomingDataPanel = document.getElementById('incomingDataPanel');
    dom.incomingDataList = document.getElementById('incomingDataList');
    dom.incomingDataCount = document.getElementById('incomingDataCount');
    dom.incomingDataSearch = document.getElementById('incomingDataSearch');
    dom.incomingDataStatusFilter = document.getElementById('incomingDataStatusFilter');
    dom.incomingDataUserFilter = document.getElementById('incomingDataUserFilter');
    dom.incomingDataFileTypeFilter = document.getElementById('incomingDataFileTypeFilter');
    dom.incomingDataDateFrom = document.getElementById('incomingDataDateFrom');
    dom.incomingDataDateTo = document.getElementById('incomingDataDateTo');
    dom.incomingDataSavedFilterName = document.getElementById('incomingDataSavedFilterName');
    dom.incomingDataSaveFilterBtn = document.getElementById('incomingDataSaveFilterBtn');
    dom.incomingDataClearFiltersBtn = document.getElementById('incomingDataClearFiltersBtn');
    dom.incomingDataSavedFiltersList = document.getElementById('incomingDataSavedFiltersList');
    dom.incomingDataActiveFilterPill = document.getElementById('incomingDataActiveFilterPill');
    dom.incomingDataPendingCount = document.getElementById('incomingDataPendingCount');
    dom.incomingDataReviewedCount = document.getElementById('incomingDataReviewedCount');
    dom.incomingDataSelectAll = document.getElementById('incomingDataSelectAll');
    dom.incomingDataSelectedCount = document.getElementById('incomingDataSelectedCount');
    dom.incomingDataBulkFeedback = document.getElementById('incomingDataBulkFeedback');
    dom.incomingDataBulkApproveBtn = document.getElementById('incomingDataBulkApproveBtn');
    dom.incomingDataBulkRejectBtn = document.getElementById('incomingDataBulkRejectBtn');
    dom.incomingDataBulkExportBtn = document.getElementById('incomingDataBulkExportBtn');
    dom.incomingDataBulkStatus = document.getElementById('incomingDataBulkStatus');
    dom.requestDataBtn = document.getElementById('requestDataBtn');
    dom.dataRequestHistoryTable = document.getElementById('dataRequestHistoryTable');
    dom.dataRequestHistorySearch = document.getElementById('dataRequestHistorySearch');
    dom.dataRequestHistoryStatusFilter = document.getElementById('dataRequestHistoryStatusFilter');
    dom.clearDataRequestHistoryFilters = document.getElementById('clearDataRequestHistoryFilters');
    dom.refreshDataRequestHistoryBtn = document.getElementById('refreshDataRequestHistoryBtn');
    dom.requestDataFromHistoryBtn = document.getElementById('requestDataFromHistoryBtn');
    dom.excelPreviewPanel = document.getElementById('excelPreviewPanel');
    dom.uploadExcelBtn = document.getElementById('uploadExcelBtn');
    dom.excelFileInput = document.getElementById('excelFileInput');
    dom.clearExcelPreviewBtn = document.getElementById('clearExcelPreviewBtn');
    dom.excelPreviewMeta = document.getElementById('excelPreviewMeta');
    dom.excelPreviewError = document.getElementById('excelPreviewError');
    dom.excelPreviewLoading = document.getElementById('excelPreviewLoading');
    dom.excelPreviewContent = document.getElementById('excelPreviewContent');
    dom.excelPreviewSearch = document.getElementById('excelPreviewSearch');
    dom.excelPreviewRowsCount = document.getElementById('excelPreviewRowsCount');
    dom.excelPreviewColumnsCount = document.getElementById('excelPreviewColumnsCount');
    dom.excelPreviewTableWrap = document.getElementById('excelPreviewTableWrap');
    dom.excelPreviewHint = document.getElementById('excelPreviewHint');
    dom.excelPrevPageBtn = document.getElementById('excelPrevPageBtn');
    dom.excelNextPageBtn = document.getElementById('excelNextPageBtn');
    dom.excelPreviewPageInfo = document.getElementById('excelPreviewPageInfo');
    dom.excelSubmissionWorkspace = document.getElementById('excelSubmissionWorkspace');
    dom.excelPreviewDirtyState = document.getElementById('excelPreviewDirtyState');
    dom.excelRecheckIssuesBtn = document.getElementById('excelRecheckIssuesBtn');
    dom.excelSaveEditsBtn = document.getElementById('excelSaveEditsBtn');
    dom.excelMappingTemplateSelect = document.getElementById('excelMappingTemplateSelect');
    dom.excelMappingHelp = document.getElementById('excelMappingHelp');
    dom.excelMappingFields = document.getElementById('excelMappingFields');
    dom.excelValidationProfile = document.getElementById('excelValidationProfile');
    dom.excelValidationIssueCount = document.getElementById('excelValidationIssueCount');
    dom.excelValidationList = document.getElementById('excelValidationList');
    dom.excelReviewHistoryMeta = document.getElementById('excelReviewHistoryMeta');
    dom.excelReviewHistoryCount = document.getElementById('excelReviewHistoryCount');
    dom.excelReviewHistoryList = document.getElementById('excelReviewHistoryList');
    dom.excelVersionComparisonMeta = document.getElementById('excelVersionComparisonMeta');
    dom.excelVersionComparisonPill = document.getElementById('excelVersionComparisonPill');
    dom.excelVersionComparisonSummary = document.getElementById('excelVersionComparisonSummary');
    dom.excelVersionComparisonList = document.getElementById('excelVersionComparisonList');
    dom.sendDataFileInput = document.getElementById('sendDataFileInput');
    dom.sendDataSelectBtn = document.getElementById('sendDataSelectBtn');
    dom.sendDataSaveDraftBtn = document.getElementById('sendDataSaveDraftBtn');
    dom.sendDataSubmitBtn = document.getElementById('sendDataSubmitBtn');
    dom.sendDataDropzone = document.getElementById('sendDataDropzone');
    dom.downloadVisitorTemplateBtn = document.getElementById('downloadVisitorTemplateBtn');
    dom.downloadRecordTemplateBtn = document.getElementById('downloadRecordTemplateBtn');
    dom.downloadAdminTourismTemplateBtn = document.getElementById('downloadAdminTourismTemplateBtn');
    dom.downloadAdminTourismTemplateCardBtn = document.getElementById('downloadAdminTourismTemplateCardBtn');
    dom.sendDataSelectedFile = document.getElementById('sendDataSelectedFile');
    dom.sendDataQueueCount = document.getElementById('sendDataQueueCount');
    dom.sendDataFileQueue = document.getElementById('sendDataFileQueue');
    dom.sendDataError = document.getElementById('sendDataError');
    dom.sendDataSuccess = document.getElementById('sendDataSuccess');
    dom.sendDataLoading = document.getElementById('sendDataLoading');
    dom.sendDataLoadingTitle = document.getElementById('sendDataLoadingTitle');
    dom.sendDataLoadingText = document.getElementById('sendDataLoadingText');
    dom.sendDataLoadingProgressBar = document.getElementById('sendDataLoadingProgressBar');
    dom.sendDataLoadingProgressLabel = document.getElementById('sendDataLoadingProgressLabel');
    dom.sendDataLoadingProgressValue = document.getElementById('sendDataLoadingProgressValue');
    dom.sendDataPreviewPanel = document.getElementById('sendDataPreviewPanel');
    dom.sendDataPreviewMeta = document.getElementById('sendDataPreviewMeta');
    dom.sendDataPreviewEmpty = document.getElementById('sendDataPreviewEmpty');
    dom.sendDataPreviewContent = document.getElementById('sendDataPreviewContent');
    dom.sendDataSheetList = document.getElementById('sendDataSheetList');
    dom.sendDataSheetCount = document.getElementById('sendDataSheetCount');
    dom.sendDataTemplateSelect = document.getElementById('sendDataTemplateSelect');
    dom.sendDataMappingHelp = document.getElementById('sendDataMappingHelp');
    dom.sendDataMappingFields = document.getElementById('sendDataMappingFields');
    dom.sendDataNotes = document.getElementById('sendDataNotes');
    dom.sendDataVersionMeta = document.getElementById('sendDataVersionMeta');
    dom.sendDataValidationProfile = document.getElementById('sendDataValidationProfile');
    dom.sendDataValidationIssueCount = document.getElementById('sendDataValidationIssueCount');
    dom.sendDataValidationList = document.getElementById('sendDataValidationList');
    dom.sendDataPreviewSearch = document.getElementById('sendDataPreviewSearch');
    dom.sendDataPreviewRowsCount = document.getElementById('sendDataPreviewRowsCount');
    dom.sendDataPreviewColumnsCount = document.getElementById('sendDataPreviewColumnsCount');
    dom.sendDataPreviewTableWrap = document.getElementById('sendDataPreviewTableWrap');
    dom.sendDataPreviewHint = document.getElementById('sendDataPreviewHint');
    dom.sendDataPrevPageBtn = document.getElementById('sendDataPrevPageBtn');
    dom.sendDataNextPageBtn = document.getElementById('sendDataNextPageBtn');
    dom.sendDataPreviewPageInfo = document.getElementById('sendDataPreviewPageInfo');
    dom.sendDataList = document.getElementById('sendDataList');
    dom.sendDataCount = document.getElementById('sendDataCount');
    dom.sendDataHistoryTotal = document.getElementById('sendDataHistoryTotal');
    dom.sendDataHistoryApprovalRate = document.getElementById('sendDataHistoryApprovalRate');
    dom.sendDataHistoryOpen = document.getElementById('sendDataHistoryOpen');
    dom.sendDataHistoryDrafts = document.getElementById('sendDataHistoryDrafts');
    dom.sendDataHistorySearch = document.getElementById('sendDataHistorySearch');
    dom.sendDataHistoryStatusFilter = document.getElementById('sendDataHistoryStatusFilter');
    dom.sendDataHistoryDateFrom = document.getElementById('sendDataHistoryDateFrom');
    dom.sendDataHistoryDateTo = document.getElementById('sendDataHistoryDateTo');
    dom.sendDataHistoryClearBtn = document.getElementById('sendDataHistoryClearBtn');

    dom.quickAddButtons = Array.from(document.querySelectorAll('[data-quick-add]'));
    dom.pageJumpButtons = Array.from(document.querySelectorAll('[data-page-jump]'));
  }

  function bindEvents() {
    dom.loginForm.addEventListener('submit', handleLogin);
    dom.registerForm?.addEventListener('submit', handleRegister);
    dom.forgotPasswordForm?.addEventListener('submit', handleForgotPassword);
    dom.twoFactorForm?.addEventListener('submit', handleVerifyTwoFactor);
    dom.togglePasswordBtn.addEventListener('click', togglePasswordVisibility);
    dom.preLoginThemeBtn.addEventListener('click', toggleTheme);
    dom.showLoginBtn?.addEventListener('click', () => setAuthMode('login'));
    dom.showRegisterBtn?.addEventListener('click', () => setAuthMode('register'));
    dom.showForgotPasswordBtn?.addEventListener('click', openForgotPasswordView);
    dom.backToLoginFromHelpBtn?.addEventListener('click', () => setAuthMode('login'));
    dom.backToLoginFromTwoFactorBtn?.addEventListener('click', handleCancelTwoFactor);
    dom.resendVerificationBtn?.addEventListener('click', handleResendVerification);
    dom.resendTwoFactorBtn?.addEventListener('click', handleResendTwoFactor);
    dom.themeBtn.addEventListener('click', toggleTheme);
    dom.accountChip?.addEventListener('click', () => openEntityModal('profile'));
    dom.accountChip?.addEventListener('keydown', handleProfileAccountKeydown);
    dom.sidebarAccount?.addEventListener('click', () => openEntityModal('profile'));
    dom.sidebarAccount?.addEventListener('keydown', handleProfileAccountKeydown);
    dom.logoutSidebarBtn?.addEventListener('click', confirmLogout);
    dom.logoutTopBtn?.addEventListener('click', confirmLogout);
    dom.menuBtn.addEventListener('click', openSidebar);
    dom.sidebarOverlay.addEventListener('click', closeSidebar);
    dom.closeModalBtn.addEventListener('click', closeModal);
    dom.cancelModalBtn.addEventListener('click', closeModal);
    dom.entityForm.addEventListener('submit', handleEntitySubmit);
    dom.closeConfirmBtn.addEventListener('click', closeConfirm);
    dom.confirmCancelBtn.addEventListener('click', closeConfirm);
    dom.confirmActionBtn.addEventListener('click', () => {
      if (typeof state.confirmHandler === 'function') {
        state.confirmHandler();
      }
    });

    dom.exportLogsBtn.addEventListener('click', () => downloadAuthenticatedFile('/activity-logs/export/', 'activity-logs.json'));
    dom.exportVisitorsExcelBtn?.addEventListener('click', () => {
      const now = new Date();
      const query = new URLSearchParams({
        month: String(now.getMonth() + 1),
        year: String(now.getFullYear()),
      });
      downloadAuthenticatedFile(
        `/visitors/export/excel/?${query.toString()}`,
        `tourism-attraction-record-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}.xlsx`
      );
    });
    dom.uploadExcelBtn?.addEventListener('click', handleExcelUploadClick);
    dom.excelFileInput?.addEventListener('change', handleExcelFileSelected);
    dom.sendDataSelectBtn?.addEventListener('click', handleSendDataSelectClick);
    dom.sendDataFileInput?.addEventListener('change', handleSendDataFileSelected);
    dom.sendDataSaveDraftBtn?.addEventListener('click', handleSendDataSaveDraft);
    dom.sendDataSubmitBtn?.addEventListener('click', handleSendDataSubmit);
    dom.sendDataDropzone?.addEventListener('click', handleSendDataSelectClick);
    dom.sendDataDropzone?.addEventListener('keydown', handleSendDataDropzoneKeydown);
    dom.sendDataDropzone?.addEventListener('dragenter', handleSendDataDropzoneDragEnter);
    dom.sendDataDropzone?.addEventListener('dragover', handleSendDataDropzoneDragOver);
    dom.sendDataDropzone?.addEventListener('dragleave', handleSendDataDropzoneDragLeave);
    dom.sendDataDropzone?.addEventListener('drop', handleSendDataDropzoneDrop);
    dom.downloadVisitorTemplateBtn?.addEventListener('click', () => downloadAuthenticatedFile('/data-submission-templates/visitor/', 'visitor-upload-template.xlsx'));
    dom.downloadRecordTemplateBtn?.addEventListener('click', () => downloadAuthenticatedFile('/data-submission-templates/record/', 'DOT-Forms.xlsx'));
    dom.downloadAdminTourismTemplateBtn?.addEventListener('click', () => downloadAuthenticatedFile('/data-submission-templates/record/', 'DOT-Forms.xlsx'));
    dom.downloadAdminTourismTemplateCardBtn?.addEventListener('click', () => downloadAuthenticatedFile('/data-submission-templates/record/', 'DOT-Forms.xlsx'));
    dom.sendDataFileQueue?.addEventListener('click', handleSendDataFileQueueClick);
    dom.sendDataSheetList?.addEventListener('click', handleSendDataSheetListClick);
    dom.sendDataSheetList?.addEventListener('change', handleSendDataSheetListChange);
    dom.sendDataTemplateSelect?.addEventListener('change', handleSendDataTemplateChange);
    dom.sendDataMappingFields?.addEventListener('change', handleSendDataMappingChange);
    dom.sendDataNotes?.addEventListener('input', handleSendDataNotesInput);
    dom.sendDataPreviewSearch?.addEventListener('input', handleSendDataPreviewSearch);
    dom.sendDataPrevPageBtn?.addEventListener('click', () => changeSendDataPreviewPage(-1));
    dom.sendDataNextPageBtn?.addEventListener('click', () => changeSendDataPreviewPage(1));
    dom.sendDataPreviewTableWrap?.addEventListener('click', handleSendDataPreviewTableClick);
    dom.sendDataList?.addEventListener('click', handleSendDataListClick);
    dom.sendDataHistorySearch?.addEventListener('input', renderSendData);
    dom.sendDataHistoryStatusFilter?.addEventListener('change', renderSendData);
    dom.sendDataHistoryDateFrom?.addEventListener('change', renderSendData);
    dom.sendDataHistoryDateTo?.addEventListener('change', renderSendData);
    dom.sendDataHistoryClearBtn?.addEventListener('click', clearSendDataHistoryFilters);
    dom.incomingDataList?.addEventListener('click', handleIncomingDataClick);
    dom.incomingDataList?.addEventListener('change', handleIncomingDataChange);
    dom.incomingDataSearch?.addEventListener('input', handleIncomingDataFiltersChanged);
    dom.incomingDataStatusFilter?.addEventListener('change', handleIncomingDataFiltersChanged);
    dom.incomingDataUserFilter?.addEventListener('change', handleIncomingDataFiltersChanged);
    dom.incomingDataFileTypeFilter?.addEventListener('change', handleIncomingDataFiltersChanged);
    dom.incomingDataDateFrom?.addEventListener('change', handleIncomingDataFiltersChanged);
    dom.incomingDataDateTo?.addEventListener('change', handleIncomingDataFiltersChanged);
    dom.incomingDataSaveFilterBtn?.addEventListener('click', saveCurrentIncomingDataFilter);
    dom.incomingDataClearFiltersBtn?.addEventListener('click', clearIncomingDataFilters);
    dom.incomingDataSavedFiltersList?.addEventListener('click', handleIncomingDataSavedFiltersClick);
    dom.incomingDataSelectAll?.addEventListener('change', handleIncomingDataSelectAllChange);
    dom.incomingDataBulkApproveBtn?.addEventListener('click', () => performIncomingDataBulkStatusUpdate('Approved'));
    dom.incomingDataBulkRejectBtn?.addEventListener('click', () => performIncomingDataBulkStatusUpdate('Rejected'));
    dom.incomingDataBulkExportBtn?.addEventListener('click', exportSelectedIncomingData);
    dom.requestDataBtn?.addEventListener('click', openDataRequestModal);
    dom.dataRequestPageForm?.addEventListener('submit', handleDataRequestPageSubmit);
    dom.refreshDataRequestTargetsBtn?.addEventListener('click', refreshDataRequestTargetsForPage);
    dom.refreshDataRequestHistoryBtn?.addEventListener('click', refreshDataRequestHistoryOnly);
    dom.requestDataFromHistoryBtn?.addEventListener('click', () => switchPage('request-data'));
    dom.dataRequestHistorySearch?.addEventListener('input', renderDataRequestHistory);
    dom.dataRequestHistoryStatusFilter?.addEventListener('change', renderDataRequestHistory);
    dom.clearDataRequestHistoryFilters?.addEventListener('click', clearDataRequestHistoryFilters);
    dom.receivedDataSearch?.addEventListener('input', renderRecords);
    dom.receivedDataEstablishmentFilter?.addEventListener('change', renderRecords);
    dom.receivedDataStatusFilter?.addEventListener('change', renderRecords);
    dom.clearReceivedDataFilters?.addEventListener('click', clearReceivedDataFilters);
    dom.receivedDataList?.addEventListener('click', handleIncomingDataClick);
    dom.clearExcelPreviewBtn?.addEventListener('click', clearExcelPreview);
    dom.excelPreviewSearch?.addEventListener('input', handleExcelPreviewSearch);
    dom.excelPrevPageBtn?.addEventListener('click', () => changeExcelPreviewPage(-1));
    dom.excelNextPageBtn?.addEventListener('click', () => changeExcelPreviewPage(1));
    dom.excelPreviewTableWrap?.addEventListener('click', handleExcelPreviewTableClick);
    dom.excelPreviewTableWrap?.addEventListener('input', handleExcelPreviewTableInput);
    dom.excelPreviewTableWrap?.addEventListener('change', handleExcelPreviewTableChange);
    dom.excelRecheckIssuesBtn?.addEventListener('click', () => validateExcelSubmissionWorkspace());
    dom.excelSaveEditsBtn?.addEventListener('click', saveExcelSubmissionWorkspace);
    dom.excelMappingTemplateSelect?.addEventListener('change', handleExcelPreviewTemplateChange);
    dom.excelMappingFields?.addEventListener('change', handleExcelPreviewMappingChange);
    dom.clearLogsBtn.addEventListener('click', confirmClearLogs);
    dom.emptyRecycleBtn.addEventListener('click', confirmEmptyRecycleBin);

    dom.addRecordBtn?.addEventListener('click', () => openEntityModal('record'));
    dom.addVisitorBtn.addEventListener('click', () => openEntityModal('visitor'));
    dom.addUserBtn.addEventListener('click', () => openEntityModal('user'));
    dom.quickAddButtons.forEach((button) => {
      button.addEventListener('click', () => openEntityModal(button.dataset.quickAdd));
    });
    dom.pageJumpButtons.forEach((button) => {
      button.addEventListener('click', () => switchPage(button.dataset.pageJump));
    });

    dom.navButtons.forEach((button) => {
      button.addEventListener('click', () => switchPage(button.dataset.page));
    });

    dom.globalSearch.addEventListener('input', handleGlobalSearch);
    dom.notificationBtn?.addEventListener('click', toggleNotificationPanel);
    dom.markAllNotificationsReadBtn?.addEventListener('click', markAllNotificationsRead);
    dom.notificationList?.addEventListener('click', handleNotificationListClick);
    window.addEventListener('storage', handleCrossTabDataUpdate);
    document.addEventListener('visibilitychange', handleVisibilityRefresh);
    document.addEventListener('click', handleDocumentClick);

    dom.recordSearch?.addEventListener('input', renderRecords);
    dom.recordCategoryFilter?.addEventListener('change', renderRecords);
    dom.clearRecordFilters?.addEventListener('click', () => {
      dom.recordSearch.value = '';
      dom.recordCategoryFilter.value = '';
      syncGlobalSearchFromPage();
      renderRecords();
    });

    dom.visitorSearch.addEventListener('input', renderVisitors);
    dom.visitorStatusFilter.addEventListener('change', renderVisitors);
    dom.clearVisitorFilters.addEventListener('click', () => {
      dom.visitorSearch.value = '';
      dom.visitorStatusFilter.value = '';
      syncGlobalSearchFromPage();
      renderVisitors();
    });

    dom.userSearch.addEventListener('input', renderUsers);
    dom.userRoleFilter.addEventListener('change', renderUsers);
    dom.userStatusFilter.addEventListener('change', renderUsers);
    dom.clearUserFilters.addEventListener('click', () => {
      dom.userSearch.value = '';
      dom.userRoleFilter.value = '';
      dom.userStatusFilter.value = '';
      syncGlobalSearchFromPage();
      renderUsers();
    });

    dom.recycleSearch.addEventListener('input', renderRecycle);
    dom.recycleTypeFilter.addEventListener('change', renderRecycle);
    dom.clearRecycleFilters.addEventListener('click', () => {
      dom.recycleSearch.value = '';
      dom.recycleTypeFilter.value = '';
      syncGlobalSearchFromPage();
      renderRecycle();
    });

    dom.logSearch.addEventListener('input', refreshLogsOnly);
    dom.logLimitFilter.addEventListener('change', refreshLogsOnly);
    dom.clearLogSearch.addEventListener('click', () => {
      dom.logSearch.value = '';
      dom.logLimitFilter.value = '25';
      syncGlobalSearchFromPage();
      refreshLogsOnly();
    });

    dom.recordTable.addEventListener('click', handleRecordTableClick);
    dom.visitorTable.addEventListener('click', handleVisitorTableClick);
    dom.userTable.addEventListener('click', handleUserTableClick);
    dom.recycleTable.addEventListener('click', handleRecycleTableClick);
  }

  function getApiBase() {
    return (window.CITOSIS_CONFIG && window.CITOSIS_CONFIG.apiBase) || '/api';
  }

  function safeStorageGet(storage, key) {
    try {
      return storage.getItem(key);
    } catch (error) {
      return null;
    }
  }

  function safeStorageSet(storage, key, value) {
    try {
      storage.setItem(key, value);
      return true;
    } catch (error) {
      return false;
    }
  }

  function safeStorageRemove(storage, key) {
    try {
      storage.removeItem(key);
    } catch (error) {
      // Ignore storage cleanup errors.
    }
  }

  function clearCookieValue(name) {
    document.cookie = `${name}=; path=/; Max-Age=0; SameSite=Lax`;
  }

  function parseStoredJson(value) {
    if (!value) return null;
    try {
      return JSON.parse(value);
    } catch (error) {
      return null;
    }
  }

  function getPersistedSession() {
    clearLegacySharedSession();

    const sessionToken = safeStorageGet(sessionStorage, AUTH_TOKEN_KEY);
    if (sessionToken) {
      return {
        token: sessionToken,
        user: parseStoredJson(safeStorageGet(sessionStorage, AUTH_USER_KEY)),
      };
    }

    return { token: null, user: null };
  }

  function persistSession(token, user, remember) {
    clearPersistedSession();
    if (!remember) {
      return;
    }

    const payload = JSON.stringify(user);
    safeStorageSet(sessionStorage, AUTH_TOKEN_KEY, token);
    safeStorageSet(sessionStorage, AUTH_USER_KEY, payload);
  }

  function updatePersistedUser(user) {
    const payload = JSON.stringify(user);
    if (safeStorageGet(sessionStorage, AUTH_TOKEN_KEY)) {
      safeStorageSet(sessionStorage, AUTH_USER_KEY, payload);
    }
  }

  function clearPersistedSession() {
    safeStorageRemove(sessionStorage, AUTH_TOKEN_KEY);
    safeStorageRemove(sessionStorage, AUTH_USER_KEY);
    clearLegacySharedSession();
  }

  function clearLegacySharedSession() {
    safeStorageRemove(localStorage, AUTH_TOKEN_KEY);
    safeStorageRemove(localStorage, AUTH_USER_KEY);
    clearCookieValue(AUTH_TOKEN_KEY);
  }

  function restoreSession() {
    const session = getPersistedSession();
    if (!session.token) {
      showLogin();
      return;
    }

    state.token = session.token;
    if (session.user) {
      state.user = session.user;
      loadIncomingDataSavedFilters();
    }
    showApp();

    const hadStoredUser = !!session.user;
    if (hadStoredUser) {
      refreshAllData();
    }

    apiRequest('/auth/me/')
      .then((user) => {
        state.user = user;
        loadIncomingDataSavedFilters();
        updatePersistedUser(user);
        updateUiForRole();
        if (!hadStoredUser) {
          refreshAllData();
        }
      })
      .catch((error) => {
        if (error && (error.status === 401 || error.status === 403)) {
          clearPersistedSession();
          state.token = null;
          state.user = null;
          showLogin();
          return;
        }
        showToast(
          'Connection issue',
          'Unable to verify your session right now. Refresh if data does not load.',
          'fa-solid fa-wifi'
        );
      });
  }

  async function apiRequest(path, options = {}) {
    const config = { method: 'GET', ...options };
    const headers = new Headers(config.headers || {});
    if (!headers.has('Accept')) {
      headers.set('Accept', 'application/json');
    }
    if (!(config.body instanceof FormData) && config.body != null && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    if (state.token && !headers.has('Authorization')) {
      headers.set('Authorization', `Token ${state.token}`);
    }

    let response;
    try {
      response = await fetch(`${getApiBase()}${path}`, {
        method: config.method,
        headers,
        body: config.body,
      });
    } catch (networkError) {
      throw new Error('Cannot connect to the CITOSIS server. Start or restart start_citosis.bat, then refresh this page.');
    }

    const contentType = response.headers.get('content-type') || '';
    let payload = null;

    if (contentType.includes('application/json')) {
      payload = await response.json();
    } else if (!config.expectBlob) {
      const text = await response.text();
      payload = text ? { detail: text } : null;
    }

    if (!response.ok) {
      const error = new Error((payload && (payload.detail || payload.message)) || 'Request failed.');
      error.status = response.status;
      error.payload = payload;
      throw error;
    }

    if (config.expectBlob) {
      return response.blob();
    }

    if (shouldBroadcastDataMutation(path, config.method)) {
      broadcastDataUpdate(path);
    }

    return payload;
  }

  function shouldBroadcastDataMutation(path, method = 'GET') {
    const normalizedMethod = String(method || 'GET').toUpperCase();
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(normalizedMethod)) {
      return false;
    }
    const normalizedPath = String(path || '');
    if (normalizedPath === '/auth/me/') {
      return true;
    }
    return !normalizedPath.startsWith('/auth/');
  }

  function broadcastDataUpdate(source = 'app') {
    safeStorageSet(localStorage, DATA_UPDATE_SIGNAL_KEY, JSON.stringify({
      source,
      userId: state.user?.id || null,
      timestamp: Date.now(),
    }));
  }

  async function apiUploadRequest(path, options = {}) {
    const config = { method: 'POST', ...options };
    const headers = new Headers(config.headers || {});
    if (!headers.has('Accept')) {
      headers.set('Accept', 'application/json');
    }
    if (state.token && !headers.has('Authorization')) {
      headers.set('Authorization', `Token ${state.token}`);
    }

    return new Promise((resolve, reject) => {
      const request = new XMLHttpRequest();
      request.open(config.method, `${getApiBase()}${path}`, true);
      headers.forEach((value, key) => {
        request.setRequestHeader(key, value);
      });

      const handleProgress = (event) => {
        if (typeof config.onProgress !== 'function') {
          return;
        }
        const progress = event.lengthComputable && event.total
          ? event.loaded / event.total
          : null;
        config.onProgress({
          loaded: event.loaded || 0,
          total: event.total || 0,
          lengthComputable: !!event.lengthComputable,
          progress,
        });
      };

      request.upload.onprogress = handleProgress;
      request.onload = () => {
        const contentType = request.getResponseHeader('content-type') || '';
        let payload = null;

        if (contentType.includes('application/json')) {
          try {
            payload = request.responseText ? JSON.parse(request.responseText) : null;
          } catch (error) {
            payload = request.responseText ? { detail: request.responseText } : null;
          }
        } else {
          payload = request.responseText ? { detail: request.responseText } : null;
        }

        if (typeof config.onProgress === 'function') {
          config.onProgress({
            loaded: 1,
            total: 1,
            lengthComputable: true,
            progress: 1,
          });
        }

        if (request.status >= 200 && request.status < 300) {
          if (shouldBroadcastDataMutation(path, config.method)) {
            broadcastDataUpdate(path);
          }
          resolve(payload);
          return;
        }

        const error = new Error((payload && (payload.detail || payload.message)) || 'Request failed.');
        error.status = request.status;
        error.payload = payload;
        reject(error);
      };

      request.onerror = () => {
        const error = new Error('Network request failed.');
        error.status = 0;
        reject(error);
      };

      if (typeof config.onProgress === 'function') {
        config.onProgress({
          loaded: 0,
          total: 0,
          lengthComputable: false,
          progress: 0,
        });
      }

      request.send(config.body ?? null);
    });
  }

  async function safeRequest(path, fallbackValue) {
    try {
      return await apiRequest(path);
    } catch (error) {
      if (error.status === 403) {
        return fallbackValue;
      }
      throw error;
    }
  }

  async function handleLogin(event) {
    event.preventDefault();
    dom.loginError.textContent = '';
    if (dom.registerSuccess) {
      dom.registerSuccess.textContent = '';
    }

    const username = document.getElementById('username').value.trim();
    const password = dom.passwordInput.value;
    const remember = document.getElementById('rememberSession').checked;

    if (!username || !password) {
      dom.loginError.textContent = 'Enter your username/email and password.';
      return;
    }

    try {
      const payload = await apiRequest('/auth/login/', {
        method: 'POST',
        body: JSON.stringify({ username, password, remember }),
      });
      if (payload?.requires_two_factor) {
        state.pendingTwoFactorChallengeId = payload.challenge_id || '';
        state.pendingTwoFactorMaskedEmail = payload.masked_email || '';
        state.pendingTwoFactorRemember = remember;
        dom.twoFactorSuccess.textContent = payload.detail || 'Enter the verification code we sent to your email.';
        dom.twoFactorSubtext.textContent = payload.masked_email
          ? `Enter the 6-digit code sent to ${payload.masked_email} to complete your Super Admin login.`
          : 'Enter the 6-digit code sent to your email to complete your Super Admin login.';
        setAuthMode('two-factor');
        dom.twoFactorCode?.focus();
        return;
      }
      await completeAuthenticatedLogin(payload, remember);
      dom.loginForm.reset();
      document.getElementById('rememberSession').checked = remember;
    } catch (error) {
      dom.loginError.textContent = error.message || 'Unable to sign in.';
    }
  }

  async function handleRegister(event) {
    event.preventDefault();
    dom.registerError.textContent = '';
    dom.registerSuccess.textContent = '';

    const name = dom.registerName.value.trim();
    const email = dom.registerEmail.value.trim();
    const office = dom.registerOffice.value.trim();
    const password = dom.registerPassword.value;
    const passwordConfirm = dom.registerPasswordConfirm.value;

    if (!name || !email || !office || !password || !passwordConfirm) {
      dom.registerError.textContent = 'Complete all registration fields first.';
      return;
    }
    if (password.length < 8) {
      dom.registerError.textContent = 'Use a password with at least 8 characters.';
      return;
    }
    if (password !== passwordConfirm) {
      dom.registerError.textContent = 'Passwords do not match.';
      return;
    }

    const submitButton = document.getElementById('registerSubmitBtn');
    if (submitButton) {
      submitButton.disabled = true;
    }

    try {
      const response = await apiRequest('/auth/register/', {
        method: 'POST',
        body: JSON.stringify({
          name,
          email,
          office,
          password,
          password_confirm: passwordConfirm,
        }),
      });
      dom.registerForm.reset();
      dom.registerSuccess.textContent = response?.detail || 'Registration submitted successfully. Verify your email and wait for admin approval before signing in.';
      dom.forgotPasswordEmail.value = email;
      document.getElementById('username').value = email;
      setAuthMode('login');
      showToast('Registration complete', 'Your request was submitted. Check your email for the verification link.');
    } catch (error) {
      dom.registerError.textContent = extractErrorMessage(error);
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
      }
    }
  }

  async function completeAuthenticatedLogin(payload, remember) {
    state.token = payload.token;
    state.user = payload.user;
    state.pendingTwoFactorChallengeId = '';
    state.pendingTwoFactorMaskedEmail = '';
    state.pendingTwoFactorRemember = true;
    loadIncomingDataSavedFilters();
    persistSession(payload.token, payload.user, remember);
    showApp();
    showToast('Welcome back', `Signed in as ${payload.user.name}.`);
    await refreshAllData();
  }

  function openForgotPasswordView() {
    dom.forgotPasswordError.textContent = '';
    dom.forgotPasswordSuccess.textContent = '';
    const loginValue = document.getElementById('username')?.value?.trim() || '';
    if (loginValue.includes('@') && dom.forgotPasswordEmail) {
      dom.forgotPasswordEmail.value = loginValue;
    }
    setAuthMode('forgot-password');
  }

  async function handleForgotPassword(event) {
    event.preventDefault();
    dom.forgotPasswordError.textContent = '';
    dom.forgotPasswordSuccess.textContent = '';
    const email = dom.forgotPasswordEmail?.value?.trim() || '';

    if (!email) {
      dom.forgotPasswordError.textContent = 'Enter the email address for the account first.';
      return;
    }

    try {
      const response = await apiRequest('/auth/forgot-password/', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      dom.forgotPasswordSuccess.textContent = response?.detail || 'If an account exists for that email, a password reset link has been sent.';
    } catch (error) {
      dom.forgotPasswordError.textContent = extractErrorMessage(error);
    }
  }

  async function handleResendVerification() {
    dom.forgotPasswordError.textContent = '';
    dom.forgotPasswordSuccess.textContent = '';
    const email = dom.forgotPasswordEmail?.value?.trim() || '';

    if (!email) {
      dom.forgotPasswordError.textContent = 'Enter the email address for the account first.';
      return;
    }

    try {
      const response = await apiRequest('/auth/resend-verification/', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      dom.forgotPasswordSuccess.textContent = response?.detail || 'If an account exists for that email, a verification email has been sent.';
    } catch (error) {
      dom.forgotPasswordError.textContent = extractErrorMessage(error);
    }
  }

  async function handleVerifyTwoFactor(event) {
    event.preventDefault();
    dom.twoFactorError.textContent = '';
    dom.twoFactorSuccess.textContent = '';
    const code = dom.twoFactorCode?.value?.trim() || '';

    if (!state.pendingTwoFactorChallengeId) {
      dom.twoFactorError.textContent = 'Your sign-in code has expired. Please sign in again.';
      setAuthMode('login');
      return;
    }

    if (!/^\d{6}$/.test(code)) {
      dom.twoFactorError.textContent = 'Enter the 6-digit verification code.';
      return;
    }

    try {
      const payload = await apiRequest('/auth/verify-2fa/', {
        method: 'POST',
        body: JSON.stringify({
          challenge_id: state.pendingTwoFactorChallengeId,
          code,
          remember: state.pendingTwoFactorRemember,
        }),
      });
      await completeAuthenticatedLogin(payload, state.pendingTwoFactorRemember);
      dom.loginForm.reset();
      dom.twoFactorForm?.reset();
      document.getElementById('rememberSession').checked = state.pendingTwoFactorRemember;
    } catch (error) {
      const message = extractErrorMessage(error);
      dom.twoFactorError.textContent = message;
      if (error.status === 400 && /sign in again/i.test(message)) {
        handleCancelTwoFactor();
        dom.loginError.textContent = message;
      }
    }
  }

  async function handleResendTwoFactor() {
    dom.twoFactorError.textContent = '';
    dom.twoFactorSuccess.textContent = '';

    if (!state.pendingTwoFactorChallengeId) {
      dom.twoFactorError.textContent = 'Your sign-in code has expired. Please sign in again.';
      setAuthMode('login');
      return;
    }

    try {
      const payload = await apiRequest('/auth/resend-2fa/', {
        method: 'POST',
        body: JSON.stringify({ challenge_id: state.pendingTwoFactorChallengeId }),
      });
      state.pendingTwoFactorChallengeId = payload.challenge_id || state.pendingTwoFactorChallengeId;
      state.pendingTwoFactorMaskedEmail = payload.masked_email || state.pendingTwoFactorMaskedEmail;
      dom.twoFactorSuccess.textContent = payload?.detail || 'A new verification code has been sent.';
      if (state.pendingTwoFactorMaskedEmail) {
        dom.twoFactorSubtext.textContent = `Enter the 6-digit code sent to ${state.pendingTwoFactorMaskedEmail} to complete your Super Admin login.`;
      }
    } catch (error) {
      const message = extractErrorMessage(error);
      dom.twoFactorError.textContent = message;
      if (error.status === 400) {
        handleCancelTwoFactor();
        dom.loginError.textContent = message;
      }
    }
  }

  function handleCancelTwoFactor() {
    state.pendingTwoFactorChallengeId = '';
    state.pendingTwoFactorMaskedEmail = '';
    state.pendingTwoFactorRemember = true;
    dom.twoFactorForm?.reset();
    setAuthMode('login');
  }

  async function openDataRequestModal() {
    if (!canApproveSubmissions()) {
      showToast('Access denied', 'Only Super Admins and Reviewers can request data from users.', 'fa-solid fa-lock');
      return;
    }

    try {
      await ensureDataRequestTargets();
      openEntityModal('data-request');
    } catch (error) {
      showToast('Users unavailable', extractErrorMessage(error), 'fa-solid fa-triangle-exclamation');
    }
  }

  async function ensureDataRequestTargets() {
    const targets = await apiRequest('/data-request-targets/');
    state.dataRequestTargets = Array.isArray(targets) ? targets : [];
    return state.dataRequestTargets;
  }

  async function refreshDataRequestTargetsForPage() {
    if (!canApproveSubmissions()) {
      showToast('Access denied', 'Only Super Admins and Reviewers can request data from users.', 'fa-solid fa-lock');
      return;
    }

    if (dom.refreshDataRequestTargetsBtn) {
      dom.refreshDataRequestTargetsBtn.disabled = true;
    }
    try {
      await ensureDataRequestTargets();
      renderDataRequestPage();
      showToast('Recipients refreshed', 'The active establishment recipient list is up to date.');
    } catch (error) {
      showToast('Recipients unavailable', extractErrorMessage(error), 'fa-solid fa-triangle-exclamation');
    } finally {
      if (dom.refreshDataRequestTargetsBtn) {
        dom.refreshDataRequestTargetsBtn.disabled = false;
      }
    }
  }

  async function handleDataRequestPageSubmit(event) {
    event.preventDefault();
    if (!canApproveSubmissions()) {
      showToast('Access denied', 'Only Super Admins and Reviewers can request data from users.', 'fa-solid fa-lock');
      return;
    }

    const selectedEstablishments = Array.from(dom.pageDataRequestEstablishments?.selectedOptions || [])
      .map((option) => String(option.value || '').trim())
      .filter(Boolean);
    if (!selectedEstablishments.length) {
      setDataRequestPageStatus('Choose at least one establishment to notify.', true);
      return;
    }
    const payload = {
      recipient_scope: 'establishment',
      establishments: selectedEstablishments,
      title: String(dom.pageDataRequestTitle?.value || '').trim(),
      message: String(dom.pageDataRequestMessage?.value || '').trim(),
      due_date: String(dom.pageDataRequestDueDate?.value || '').trim(),
    };
    if (!payload.message) {
      setDataRequestPageStatus('Describe the data you need from the user.', true);
      return;
    }

    if (dom.sendDataRequestPageBtn) {
      dom.sendDataRequestPageBtn.disabled = true;
    }
    setDataRequestPageStatus('Sending request...', false);
    try {
      const result = await apiRequest('/data-requests/', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setDataRequestPageStatus(result.detail || 'Data request sent successfully.', false);
      showToast('Data request sent', result.detail || 'Users were notified.');
      dom.dataRequestPageForm?.reset();
      if (dom.pageDataRequestTitle) {
        dom.pageDataRequestTitle.value = 'Data request from admin';
      }
      await refreshDataRequestHistoryOnly();
    } catch (error) {
      setDataRequestPageStatus(extractErrorMessage(error), true);
    } finally {
      if (dom.sendDataRequestPageBtn) {
        dom.sendDataRequestPageBtn.disabled = false;
      }
    }
  }

  function setDataRequestPageStatus(message, isError = false) {
    if (!dom.dataRequestPageStatus) {
      return;
    }
    dom.dataRequestPageStatus.textContent = message || '';
    dom.dataRequestPageStatus.classList.toggle('error-text', Boolean(isError));
    dom.dataRequestPageStatus.classList.toggle('success-text', Boolean(message && !isError));
  }

  async function refreshDataRequestHistoryOnly() {
    if (!canApproveSubmissions()) {
      showToast('Access denied', 'Only Super Admins and Reviewers can view request history.', 'fa-solid fa-lock');
      return;
    }

    if (dom.refreshDataRequestHistoryBtn) {
      dom.refreshDataRequestHistoryBtn.disabled = true;
    }
    try {
      const history = await apiRequest('/data-requests/history/');
      state.dataRequestHistory = Array.isArray(history) ? history : [];
      renderDataRequestHistory();
      updateBadges();
      showToast('Request history refreshed', 'Latest request data history is now shown.');
    } catch (error) {
      showToast('History unavailable', extractErrorMessage(error), 'fa-solid fa-triangle-exclamation');
    } finally {
      if (dom.refreshDataRequestHistoryBtn) {
        dom.refreshDataRequestHistoryBtn.disabled = false;
      }
    }
  }

  function confirmLogout() {
    openConfirm({
      title: 'Sign out',
      subtitle: 'You will need to sign in again to continue.',
      content: '<p>Are you sure you want to log out?</p>',
      confirmText: 'Log out',
      onConfirm: async () => {
        closeConfirm();
        await performLogout();
      },
    });
  }

  async function performLogout() {
    try {
      if (state.token) {
        await apiRequest('/auth/logout/', { method: 'POST' });
      }
    } catch (error) {
      // Ignore logout transport errors and clear session anyway.
    } finally {
      clearPersistedSession();
      state.token = null;
      state.user = null;
      state.dashboard = null;
      state.notifications = [];
      state.dataRequestTargets = [];
      state.incomingDataSavedFilters = [];
      state.incomingDataActiveSavedFilterId = '';
      state.sendDataFiles = [];
      state.sendDataActiveFileId = null;
      state.records = [];
      state.visitors = [];
      state.users = [];
      state.recycle = [];
      state.logs = [];
      state.sendDataSheetConfigs = {};
      stopAppAutoRefresh();
      stopRealtimeIncomingDataPolling();
      closeNotificationPanel();
      showLogin();
      showToast('Signed out', 'Your session has been cleared.');
    }
  }

  function showLogin() {
    stopAppAutoRefresh();
    stopRealtimeIncomingDataPolling();
    dom.loginPage.classList.remove('hidden');
    dom.app.classList.add('hidden');
    closeSidebar();
    dom.pageTitle.textContent = PAGE_TITLES.dashboard;
    state.pendingTwoFactorChallengeId = '';
    state.pendingTwoFactorMaskedEmail = '';
    state.pendingTwoFactorRemember = true;
    updateCurrentAccountIdentity();
    setAuthMode('login');
  }

  function showApp() {
    dom.loginPage.classList.add('hidden');
    dom.app.classList.remove('hidden');
    startAppAutoRefresh();
    switchPage(getDefaultPageForUser());
    updateUiForRole();
  }

  function loadTheme() {
    const savedTheme = localStorage.getItem('citosis_theme');
    if (savedTheme === 'dark') {
      document.body.classList.add('dark');
    }
  }

  function toggleTheme() {
    document.body.classList.toggle('dark');
    localStorage.setItem('citosis_theme', document.body.classList.contains('dark') ? 'dark' : 'light');
  }

  function togglePasswordVisibility() {
    const isPassword = dom.passwordInput.type === 'password';
    dom.passwordInput.type = isPassword ? 'text' : 'password';
    dom.togglePasswordBtn.innerHTML = isPassword
      ? '<i class="fa-regular fa-eye-slash"></i>'
      : '<i class="fa-regular fa-eye"></i>';
  }

  function startClock() {
    const updateClock = () => {
      const now = new Date();
      dom.clockText.textContent = now.toLocaleString([], {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
      });
    };
    updateClock();
    setInterval(updateClock, 1000);
  }

  function openSidebar() {
    dom.sidebar.classList.add('open');
    dom.sidebarOverlay.classList.add('show');
  }

  function closeSidebar() {
    dom.sidebar.classList.remove('open');
    dom.sidebarOverlay.classList.remove('show');
  }

  function handleProfileAccountKeydown(event) {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }
    event.preventDefault();
    openEntityModal('profile');
  }

  function switchPage(page) {
    if (page === 'dashboard' && !canAccessAdminDashboard()) {
      page = getDefaultPageForUser();
    }
    if (page === 'incoming-data' && !canAccessAdminDashboard()) {
      page = getDefaultPageForUser();
    }
    if (page === 'request-data' && !canApproveSubmissions()) {
      page = getDefaultPageForUser();
    }
    if (page === 'request-history' && !canApproveSubmissions()) {
      page = getDefaultPageForUser();
    }
    if (page === 'users' && !canViewUsers()) {
      page = getDefaultPageForUser();
    }
    if (page === 'send-data' && canAccessAdminDashboard()) {
      page = getDefaultPageForUser();
    }
    if (page === 'sent-data' && canAccessAdminDashboard()) {
      page = getDefaultPageForUser();
    }
    if (page === 'records' && !canAccessAdminDashboard()) {
      page = getDefaultPageForUser();
    }
    if (page === 'logs' && !canManageUsers()) {
      page = getDefaultPageForUser();
    }
    state.currentPage = page;
    dom.navButtons.forEach((button) => {
      button.classList.toggle('active', button.dataset.page === page);
    });
    dom.pages.forEach((section) => {
      section.classList.toggle('active', section.id === page);
    });
    dom.pageTitle.textContent = PAGE_TITLES[page] || 'Dashboard';
    syncGlobalSearchFromPage();
    renderCurrentPage();
    closeSidebar();
    closeNotificationPanel();
  }

  function syncGlobalSearchFromPage() {
    const pageSearchMap = {
      'incoming-data': dom.incomingDataSearch,
      'request-history': dom.dataRequestHistorySearch,
      'sent-data': dom.sendDataHistorySearch,
      records: dom.receivedDataSearch || dom.recordSearch,
      visitors: dom.visitorSearch,
      users: dom.userSearch,
      recycle: dom.recycleSearch,
      logs: dom.logSearch,
    };
    dom.globalSearch.value = pageSearchMap[state.currentPage] ? pageSearchMap[state.currentPage].value : '';
  }

  function handleGlobalSearch(event) {
    const value = event.target.value;
    const pageSearchMap = {
      'incoming-data': dom.incomingDataSearch,
      'sent-data': dom.sendDataHistorySearch,
      records: dom.receivedDataSearch || dom.recordSearch,
      visitors: dom.visitorSearch,
      users: dom.userSearch,
      recycle: dom.recycleSearch,
      logs: dom.logSearch,
    };
    const targetInput = pageSearchMap[state.currentPage];
    if (targetInput) {
      targetInput.value = value;
      if (state.currentPage === 'logs') {
        refreshLogsOnly();
      } else {
        renderCurrentPage();
      }
    }
  }

  async function refreshAllData(options = {}) {
    const silent = !!options.silent;
    try {
      const logLimit = dom.logLimitFilter.value || '25';
      const dashboardRequest = canAccessAdminDashboard()
        ? apiRequest('/dashboard/overview/')
        : Promise.resolve(null);
      const submissionsRequest = state.token
        ? apiRequest('/data-submissions/')
        : Promise.resolve([]);
      const notificationsRequest = state.token
        ? apiRequest('/submission-notifications/')
        : Promise.resolve([]);
      const dataRequestTargetsRequest = canApproveSubmissions()
        ? safeRequest('/data-request-targets/', [])
        : Promise.resolve([]);
      const dataRequestHistoryRequest = canApproveSubmissions()
        ? safeRequest('/data-requests/history/', [])
        : Promise.resolve([]);
      const logsRequest = canManageUsers()
        ? apiRequest(`/activity-logs/?limit=${encodeURIComponent(logLimit)}`)
        : Promise.resolve([]);
      const [dashboard, submissions, notifications, dataRequestTargets, dataRequestHistory, records, visitors, users, recycle, logs] = await Promise.all([
        dashboardRequest,
        submissionsRequest,
        notificationsRequest,
        dataRequestTargetsRequest,
        dataRequestHistoryRequest,
        apiRequest('/records/'),
        apiRequest('/visitors/'),
        safeRequest('/users/', []),
        safeRequest('/recycle-bin/', []),
        logsRequest,
      ]);

      state.dashboard = dashboard;
      state.dataSubmissions = Array.isArray(submissions) ? submissions : [];
      state.notifications = Array.isArray(notifications) ? notifications : [];
      state.dataRequestTargets = Array.isArray(dataRequestTargets) ? dataRequestTargets : [];
      state.dataRequestHistory = Array.isArray(dataRequestHistory) ? dataRequestHistory : [];
      state.records = Array.isArray(records) ? records : [];
      state.visitors = Array.isArray(visitors) ? visitors : [];
      state.users = Array.isArray(users) ? users : [];
      state.recycle = Array.isArray(recycle) ? recycle : [];
      state.logs = Array.isArray(logs) ? logs : [];

      renderAll();
      updateUiForRole();
    } catch (error) {
      if (!silent) {
        showToast('Error', error.message || 'Unable to load dashboard data.', 'fa-solid fa-triangle-exclamation');
      }
    }
  }

  function startAppAutoRefresh() {
    if (state.appAutoRefreshTimer) {
      return;
    }
    state.appAutoRefreshTimer = window.setInterval(() => {
      queueAppAutoRefresh();
    }, APP_AUTO_REFRESH_INTERVAL_MS);
  }

  function stopAppAutoRefresh() {
    if (state.appAutoRefreshTimer) {
      window.clearInterval(state.appAutoRefreshTimer);
      state.appAutoRefreshTimer = null;
    }
    state.appAutoRefreshInFlight = false;
  }

  async function queueAppAutoRefresh() {
    if (!state.token || state.appAutoRefreshInFlight || document.hidden) {
      return;
    }
    state.appAutoRefreshInFlight = true;
    try {
      await refreshAllData({ silent: true });
    } finally {
      state.appAutoRefreshInFlight = false;
    }
  }

  function handleVisibilityRefresh() {
    if (!document.hidden) {
      queueAppAutoRefresh();
    }
  }

  function handleCrossTabDataUpdate(event) {
    if (event.key !== DATA_UPDATE_SIGNAL_KEY || !event.newValue || !state.token) {
      return;
    }
    queueAppAutoRefresh();
  }

  function updateRealtimeIncomingDataPolling() {
    if (state.token && canAccessAdminDashboard()) {
      startRealtimeIncomingDataPolling();
      return;
    }
    stopRealtimeIncomingDataPolling();
  }

  function startRealtimeIncomingDataPolling() {
    if (state.incomingDataRealtimeTimer) {
      return;
    }
    state.incomingDataRealtimeTimer = window.setInterval(() => {
      pollRealtimeIncomingDataUpdates();
    }, INCOMING_DATA_REALTIME_POLL_INTERVAL_MS);
  }

  function stopRealtimeIncomingDataPolling() {
    if (state.incomingDataRealtimeTimer) {
      window.clearInterval(state.incomingDataRealtimeTimer);
      state.incomingDataRealtimeTimer = null;
    }
    state.incomingDataRealtimePollInFlight = false;
  }

  async function pollRealtimeIncomingDataUpdates() {
    if (!state.token || !canAccessAdminDashboard() || state.incomingDataRealtimePollInFlight) {
      return;
    }

    state.incomingDataRealtimePollInFlight = true;
    const previousSubmissions = Array.isArray(state.dataSubmissions) ? state.dataSubmissions : [];

    try {
      const [dashboard, submissions, notifications] = await Promise.all([
        apiRequest('/dashboard/overview/'),
        apiRequest('/data-submissions/'),
        apiRequest('/submission-notifications/'),
      ]);

      const nextSubmissions = Array.isArray(submissions) ? submissions : [];
      const newSubmissions = getRealtimeNewSubmissions(previousSubmissions, nextSubmissions);
      state.dashboard = dashboard;
      state.dataSubmissions = nextSubmissions;
      state.notifications = Array.isArray(notifications) ? notifications : [];
      syncRealtimeExcelPreview();
      renderDashboard();
      renderNotifications();

      if (newSubmissions.length) {
        announceRealtimeIncomingSubmissions(newSubmissions);
      }
    } catch (error) {
      // Ignore transient realtime polling errors and keep the dashboard usable.
    } finally {
      state.incomingDataRealtimePollInFlight = false;
    }
  }

  function getRealtimeNewSubmissions(previousSubmissions, nextSubmissions) {
    const existingIds = new Set(
      (Array.isArray(previousSubmissions) ? previousSubmissions : [])
        .map((submission) => Number(submission && submission.id))
        .filter((submissionId) => Number.isInteger(submissionId))
    );
    return (Array.isArray(nextSubmissions) ? nextSubmissions : []).filter((submission) => {
      const submissionId = Number(submission && submission.id);
      return Number.isInteger(submissionId) && !existingIds.has(submissionId);
    });
  }

  function announceRealtimeIncomingSubmissions(newSubmissions) {
    const highPrioritySubmissions = newSubmissions.filter((submission) => !!submission.is_high_priority);
    const standardSubmissions = newSubmissions.filter((submission) => !submission.is_high_priority);

    if (standardSubmissions.length) {
      const firstSubmission = standardSubmissions[0];
      showToast(
        'New submission received',
        standardSubmissions.length === 1
          ? `${firstSubmission.original_filename} just arrived in Incoming Data.`
          : `${standardSubmissions.length} new files just arrived in Incoming Data.`,
        'fa-solid fa-inbox'
      );
    }

    if (highPrioritySubmissions.length) {
      const firstPrioritySubmission = highPrioritySubmissions[0];
      showToast(
        'High-priority file uploaded',
        highPrioritySubmissions.length === 1
          ? `${firstPrioritySubmission.original_filename} needs attention now.`
          : `${highPrioritySubmissions.length} high-priority files just arrived for admin review.`,
        'fa-solid fa-bell'
      );
    }
  }

  function syncRealtimeExcelPreview() {
    if (!state.excelPreview || !Number.isInteger(Number(state.excelPreview.sourceSubmissionId))) {
      return;
    }

    const activeSubmission = state.dataSubmissions.find(
      (submission) => Number(submission.id) === Number(state.excelPreview.sourceSubmissionId)
    );
    if (!activeSubmission) {
      return;
    }

    state.excelPreview.sourceSubmissionStatus = activeSubmission.status || state.excelPreview.sourceSubmissionStatus;
    state.excelPreview.sourceSubmissionFeedback = activeSubmission.admin_feedback || '';
    state.excelPreview.sourceSubmissionCreatedAt = activeSubmission.created_at || state.excelPreview.sourceSubmissionCreatedAt;
    state.excelPreview.sourceSubmissionUpdatedAt = activeSubmission.updated_at || state.excelPreview.sourceSubmissionUpdatedAt;
  }

  async function refreshLogsOnly() {
    if (!state.token || !canManageUsers()) {
      return;
    }
    try {
      const query = new URLSearchParams({
        limit: dom.logLimitFilter.value || '25',
      });
      if (dom.logSearch.value.trim()) {
        query.set('search', dom.logSearch.value.trim());
      }
      state.logs = await apiRequest(`/activity-logs/?${query.toString()}`);
      renderLogs();
    } catch (error) {
      showToast('Logs error', error.message || 'Unable to load activity logs.', 'fa-solid fa-triangle-exclamation');
    }
  }

  function renderAll() {
    renderDashboard();
    renderIncomingData();
    renderDataRequestPage();
    renderDataRequestHistory();
    renderExcelPreview();
    renderNotifications();
    renderRecords();
    renderVisitors();
    renderSendData();
    renderUsers();
    renderRecycle();
    renderLogs();
    updateBadges();
  }

  function renderCurrentPage() {
    switch (state.currentPage) {
      case 'incoming-data':
        renderIncomingData();
        renderExcelPreview();
        break;
      case 'request-data':
        renderDataRequestPage();
        break;
      case 'request-history':
        renderDataRequestHistory();
        break;
      case 'records':
        renderRecords();
        break;
      case 'visitors':
        renderVisitors();
        break;
      case 'users':
        renderUsers();
        break;
      case 'send-data':
        renderSendData();
        break;
      case 'sent-data':
        renderSendData();
        break;
      case 'recycle':
        renderRecycle();
        break;
      case 'logs':
        renderLogs();
        break;
      default:
        renderDashboard();
        break;
    }
  }

  function renderDashboard() {
    if (!canAccessAdminDashboard()) {
      toggleElement(dom.adminIntelligenceSection, false);
      dom.statRecords.textContent = state.records.length || 0;
      dom.statVisitors.textContent = state.visitors.length || 0;
      dom.statUsers.textContent = 0;
      dom.statRecycle.textContent = 0;
      dom.statRecordsMeta.textContent = `${state.records.length || 0} destination record(s) available.`;
      dom.statVisitorsMeta.textContent = `${state.visitors.length || 0} visitor entry/entries available.`;
      dom.statUsersMeta.textContent = 'User management is available to admins only.';
      dom.statRecycleMeta.textContent = 'Recycle bin access is available to admins only.';
      dom.destinationBars.innerHTML = buildEmptyState('Admin dashboard access is limited to administrator accounts.');
      dom.activityFeed.innerHTML = buildEmptyState('Only admins can view recent activity in this dashboard.');
      dom.recentRecords.innerHTML = buildEmptyState('Switch to Tourism Records to continue browsing destination data.');
      dom.summaryList.innerHTML = buildEmptyState('Admin-only dashboard widgets are not available for your role.');
      return;
    }

    const stats = state.dashboard && state.dashboard.stats ? state.dashboard.stats : {
      records: state.records.length,
      visitors: state.visitors.length,
      users: state.users.filter((user) => user.status === 'Active').length,
      recycle: state.recycle.length,
    };

    dom.statRecords.textContent = stats.records || 0;
    dom.statVisitors.textContent = stats.visitors || 0;
    dom.statUsers.textContent = stats.users || 0;
    dom.statRecycle.textContent = stats.recycle || 0;

    dom.statRecordsMeta.textContent = stats.records ? `${stats.records} destination records stored.` : 'No destinations saved yet.';
    dom.statVisitorsMeta.textContent = stats.visitors ? `${stats.visitors} visitor entries tracked.` : 'No visitor records yet.';
    dom.statUsersMeta.textContent = stats.users ? `${stats.users} active user account(s) available.` : 'No active user accounts.';
    dom.statRecycleMeta.textContent = stats.recycle ? `${stats.recycle} item(s) can still be restored.` : 'Deleted items are recoverable here.';

    renderAdminIntelligence(state.dashboard && state.dashboard.intelligence);

    const destinationRows = Array.isArray(state.dashboard && state.dashboard.destination_popularity)
      ? state.dashboard.destination_popularity
      : [];

    if (!destinationRows.length) {
      dom.destinationBars.innerHTML = buildEmptyState('No destination visits yet.');
    } else {
      const maxValue = Math.max(...destinationRows.map((row) => Number(row.total) || 0), 1);
      dom.destinationBars.innerHTML = destinationRows
        .map((row) => {
          const width = Math.max(8, Math.round(((Number(row.total) || 0) / maxValue) * 100));
          return `
            <div class="bar-item">
              <label>
                <span>${escapeHtml(row.place || 'Unknown destination')}</span>
                <span>${Number(row.total) || 0} visit(s)</span>
              </label>
              <div class="bar-track">
                <div class="bar-fill" style="width:${width}%"></div>
              </div>
            </div>
          `;
        })
        .join('');
    }

    const recentActivity = Array.isArray(state.dashboard && state.dashboard.recent_activity)
      ? state.dashboard.recent_activity
      : [];
    dom.activityFeed.innerHTML = recentActivity.length
      ? recentActivity
          .map((item) => `
            <div class="list-item">
              <div>
                <strong>${escapeHtml(item.action || 'Activity')}</strong>
                <p>${escapeHtml(item.details || 'No details provided.')}</p>
                <small>${escapeHtml(item.user_name || item.user_username || 'System')} | ${formatDateTime(item.created_at)}</small>
              </div>
              <span class="mini-pill"><i class="fa-solid fa-clock"></i>${timeAgo(item.created_at)}</span>
            </div>
          `)
          .join('')
      : buildEmptyState('No activity logged yet.');

    const recentRecords = Array.isArray(state.dashboard && state.dashboard.recent_records)
      ? state.dashboard.recent_records
      : [];
    dom.recentRecords.innerHTML = recentRecords.length
      ? recentRecords
          .map((record) => `
            <div class="list-item">
              <div>
                <strong>${escapeHtml(record.name)}</strong>
                <p>${escapeHtml(record.location)} | ${escapeHtml(record.category)}</p>
                <small>Updated ${formatDateTime(record.updated_at)}</small>
              </div>
            </div>
          `)
          .join('')
      : buildEmptyState('No recent destination updates.');

    const summaryItems = Array.isArray(state.dashboard && state.dashboard.summary)
      ? state.dashboard.summary
      : [];
    dom.summaryList.innerHTML = summaryItems.length
      ? summaryItems
          .map((item) => `
            <div class="list-item">
              <div>
                <strong>${escapeHtml(item.title || 'Summary')}</strong>
                <p>${escapeHtml(item.description || '')}</p>
              </div>
              <span class="mini-pill"><i class="fa-solid fa-chart-simple"></i>${escapeHtml(String(item.value ?? 0))}</span>
            </div>
          `)
          .join('')
      : buildEmptyState('Summary data will appear here once records are added.');
  }

  function renderAdminIntelligence(intelligence) {
    if (!dom.adminIntelligenceSection) {
      return;
    }

    if (!canAccessAdminDashboard()) {
      toggleElement(dom.adminIntelligenceSection, false);
      return;
    }

    toggleElement(dom.adminIntelligenceSection, true);

    const metrics = Array.isArray(intelligence && intelligence.metrics)
      ? intelligence.metrics
      : [];
    const charts = intelligence && intelligence.charts ? intelligence.charts : {};

    if (dom.adminMetricsGrid) {
      dom.adminMetricsGrid.innerHTML = metrics.length
        ? metrics.map((metric) => buildDashboardMetricCard(metric)).join('')
        : buildEmptyState('Admin metrics will appear once submissions and visitors start coming in.');
    }

    if (dom.submissionsTrendChart) {
      dom.submissionsTrendChart.innerHTML = buildDashboardTrendCard(
        charts.submissions,
        {
          iconClass: 'fa-solid fa-file-arrow-up',
          accentClass: 'is-primary',
          emptyMessage: 'Submission trend data will appear here once files reach the admin queue.',
        }
      );
    }

    if (dom.visitorsGrowthChart) {
      dom.visitorsGrowthChart.innerHTML = buildDashboardTrendCard(
        charts.visitors,
        {
          iconClass: 'fa-solid fa-users',
          accentClass: 'is-success',
          emptyMessage: 'Visitor growth data will appear here once visitor entries are added.',
        }
      );
    }

    if (dom.destinationsTrendChart) {
      dom.destinationsTrendChart.innerHTML = buildDestinationTrendCard(
        charts.destinations,
        'Destination trends will appear here once visitor activity is recorded.'
      );
    }
  }

  function buildDashboardMetricCard(metric) {
    const config = getDashboardMetricConfig(metric && metric.key);
    const toneClass = metric && metric.tone ? `is-${metric.tone}` : 'is-neutral';
    const displayValue = metric && metric.display_value
      ? metric.display_value
      : formatCompactNumber(metric && metric.value);

    return `
      <article class="metric-card ${toneClass}">
        <div class="metric-card-head">
          <span class="metric-card-kicker">${escapeHtml(config.kicker)}</span>
          <span class="metric-card-icon">
            <i class="${config.iconClass}"></i>
          </span>
        </div>
        <div class="metric-card-copy">
          <h3>${escapeHtml(metric && metric.title ? metric.title : 'Metric')}</h3>
          <div class="metric-card-value">${escapeHtml(displayValue)}</div>
          <p class="metric-card-description">${escapeHtml(metric && metric.description ? metric.description : 'No details available yet.')}</p>
        </div>
        <p class="metric-card-meta">${escapeHtml(metric && metric.meta ? metric.meta : 'Waiting for more data.')}</p>
      </article>
    `;
  }

  function getDashboardMetricConfig(key) {
    const config = {
      submissions_today: {
        iconClass: 'fa-solid fa-file-arrow-up',
        kicker: 'Review Queue',
      },
      pending_reviews: {
        iconClass: 'fa-solid fa-hourglass-half',
        kicker: 'Attention Needed',
      },
      rejection_rate: {
        iconClass: 'fa-solid fa-circle-xmark',
        kicker: 'Quality Signal',
      },
      avg_review_time: {
        iconClass: 'fa-solid fa-stopwatch',
        kicker: 'Response Time',
      },
    };
    return config[key] || {
      iconClass: 'fa-solid fa-chart-simple',
      kicker: 'Dashboard Metric',
    };
  }

  function buildDashboardTrendCard(chart, options = {}) {
    const points = Array.isArray(chart && chart.points) ? chart.points : [];
    if (!points.length) {
      return buildEmptyState(options.emptyMessage || 'Trend data is not available yet.');
    }

    const values = points.map((point) => Number(point && point.value) || 0);
    const labels = buildDashboardAxisLabels(points);
    const peakValue = Math.max(...values, 0);

    return `
      <div class="trend-card ${options.accentClass || 'is-primary'}">
        <div class="trend-card-top">
          <div>
            <strong>${escapeHtml(formatCompactNumber(chart && chart.total))}</strong>
            <p>${escapeHtml(chart && chart.summary ? chart.summary : 'No trend summary available yet.')}</p>
          </div>
          <span class="mini-pill trend-card-pill">
            <i class="${options.iconClass || 'fa-solid fa-chart-line'}"></i>
            ${escapeHtml(chart && chart.window_label ? chart.window_label : 'Recent view')}
          </span>
        </div>
        <div class="trend-card-chart">
          ${buildDashboardLineChartSvg(values, options.accentClass || 'is-primary')}
        </div>
        <div class="trend-card-footer">
          <span>${escapeHtml(chart && chart.change_label ? chart.change_label : 'No comparison available yet.')}</span>
          <span>Peak ${escapeHtml(formatCompactNumber(peakValue))}</span>
        </div>
        <div class="trend-card-axis">
          ${labels.map((label) => `<span>${escapeHtml(label)}</span>`).join('')}
        </div>
      </div>
    `;
  }

  function buildDestinationTrendCard(chart, emptyMessage) {
    const items = Array.isArray(chart && chart.items) ? chart.items : [];
    if (!items.length) {
      return buildEmptyState(emptyMessage || 'Destination trend data is not available yet.');
    }

    return `
      <div class="destination-trend-list">
        <div class="destination-trend-summary">
          <p>${escapeHtml(chart && chart.summary ? chart.summary : 'Recent destination momentum is shown below.')}</p>
          <span class="mini-pill">
            <i class="fa-solid fa-calendar-week"></i>
            ${escapeHtml(chart && chart.window_label ? chart.window_label : 'Recent view')}
          </span>
        </div>
        ${items.map((item) => {
          const values = Array.isArray(item && item.points)
            ? item.points.map((point) => Number(point && point.value) || 0)
            : [];
          return `
            <article class="destination-trend-item">
              <div class="destination-trend-head">
                <div>
                  <strong>${escapeHtml(item && item.label ? item.label : 'Destination')}</strong>
                  <p>${escapeHtml(item && item.summary ? item.summary : 'No destination summary available yet.')}</p>
                </div>
                <span class="destination-trend-total">${escapeHtml(formatCompactNumber(item && item.total))}</span>
              </div>
              <div class="destination-trend-chart">
                ${buildDashboardLineChartSvg(values, 'is-accent', true)}
              </div>
              <div class="destination-trend-meta">
                <span>${escapeHtml(formatCompactNumber(item && item.recent_total))} recent</span>
                <span>${escapeHtml(chart && chart.window_label ? chart.window_label : 'Recent view')}</span>
              </div>
            </article>
          `;
        }).join('')}
      </div>
    `;
  }

  function buildDashboardAxisLabels(points) {
    const labels = points.map((point) => point && point.label ? point.label : '');
    if (!labels.length) {
      return ['Start', 'Middle', 'End'];
    }
    if (labels.length === 1) {
      return [labels[0], labels[0], labels[0]];
    }
    const middleIndex = Math.floor((labels.length - 1) / 2);
    return [labels[0], labels[middleIndex], labels[labels.length - 1]];
  }

  function buildDashboardLineChartSvg(values, accentClass = 'is-primary', compact = false) {
    const chartValues = Array.isArray(values) && values.length ? values : [0];
    const width = compact ? 320 : 360;
    const height = compact ? 84 : 170;
    const padding = compact ? 8 : 14;
    const bottom = height - padding;
    const top = padding;
    const minValue = Math.min(...chartValues);
    const maxValue = Math.max(...chartValues, 1);
    const valueRange = Math.max(maxValue - minValue, 1);
    const step = chartValues.length > 1
      ? (width - (padding * 2)) / (chartValues.length - 1)
      : 0;

    const points = chartValues.map((value, index) => {
      const x = padding + (step * index);
      const normalized = (value - minValue) / valueRange;
      const y = bottom - (normalized * (height - (padding * 2)));
      return {
        x: Number(x.toFixed(2)),
        y: Number(y.toFixed(2)),
        value,
      };
    });

    const linePath = points
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
      .join(' ');
    const areaPath = points.length === 1
      ? `M ${points[0].x} ${bottom} L ${points[0].x} ${points[0].y} L ${points[0].x} ${bottom} Z`
      : `M ${points[0].x} ${bottom} ${points.map((point) => `L ${point.x} ${point.y}`).join(' ')} L ${points[points.length - 1].x} ${bottom} Z`;
    const gridLines = compact
      ? ''
      : [0.25, 0.5, 0.75]
          .map((ratio) => {
            const y = Number((top + ((height - (padding * 2)) * ratio)).toFixed(2));
            return `<line x1="${padding}" y1="${y}" x2="${width - padding}" y2="${y}"></line>`;
          })
          .join('');
    const pointMarkers = compact
      ? ''
      : points.map((point) => `<circle cx="${point.x}" cy="${point.y}" r="3"></circle>`).join('');

    return `
      <svg class="dashboard-line-chart ${accentClass} ${compact ? 'is-compact' : ''}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true">
        <g class="dashboard-line-grid">${gridLines}</g>
        <path class="dashboard-line-area" d="${areaPath}"></path>
        <path class="dashboard-line-path" d="${linePath}"></path>
        <g class="dashboard-line-points">${pointMarkers}</g>
      </svg>
    `;
  }

  function renderRecords() {
    if (canAccessAdminDashboard()) {
      renderReceivedDataByEstablishment();
      return;
    }

    if (!dom.recordSearch || !dom.recordCategoryFilter || !dom.recordTable) {
      return;
    }

    const search = dom.recordSearch.value.trim().toLowerCase();
    const category = dom.recordCategoryFilter.value.trim();
    const filtered = state.records.filter((record) => {
      const matchesSearch = !search || [record.name, record.location, record.category, record.description]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(search);
      const matchesCategory = !category || record.category === category;
      return matchesSearch && matchesCategory;
    });

    if (!filtered.length) {
      dom.recordTable.innerHTML = buildEmptyTableRow(6, 'No tourism records match your filters.');
      return;
    }

    dom.recordTable.innerHTML = filtered.map((record) => buildRecordRow(record)).join('');
  }

  function renderReceivedDataByEstablishment() {
    if (!dom.receivedDataList) {
      return;
    }

    renderReceivedDataEstablishmentOptions();

    const search = dom.receivedDataSearch?.value.trim().toLowerCase() || '';
    const establishmentFilter = dom.receivedDataEstablishmentFilter?.value.trim() || '';
    const statusFilter = dom.receivedDataStatusFilter?.value.trim() || '';
    const submissions = state.dataSubmissions.filter((submission) => {
      const establishment = getSubmissionEstablishment(submission);
      const haystack = [
        establishment,
        submission.submitted_by_name,
        submission.submitted_by_email,
        submission.original_filename,
        submission.sheet_name,
        submission.status,
        submission.submission_notes,
        submission.admin_feedback,
        submission.mapping_profile_label,
      ].filter(Boolean).join(' ').toLowerCase();
      const matchesSearch = !search || haystack.includes(search);
      const matchesEstablishment = !establishmentFilter || establishment === establishmentFilter;
      const matchesStatus = !statusFilter || submission.status === statusFilter;
      return matchesSearch && matchesEstablishment && matchesStatus;
    });

    if (dom.receivedDataCount) {
      const establishmentCount = new Set(submissions.map(getSubmissionEstablishment)).size;
      dom.receivedDataCount.innerHTML = `<i class="fa-solid fa-inbox"></i>${submissions.length} received | ${establishmentCount} establishment(s)`;
    }

    if (!submissions.length) {
      dom.receivedDataList.innerHTML = buildEmptyState(
        state.dataSubmissions.length
          ? 'No received data matches your current filters.'
          : 'No received user data yet.'
      );
      return;
    }

    const groups = groupSubmissionsByEstablishment(submissions);
    dom.receivedDataList.innerHTML = groups.map((group) => buildReceivedDataGroupMarkup(group)).join('');
  }

  function renderReceivedDataEstablishmentOptions() {
    if (!dom.receivedDataEstablishmentFilter) {
      return;
    }

    const currentValue = dom.receivedDataEstablishmentFilter.value;
    const establishments = Array.from(new Set(state.dataSubmissions.map(getSubmissionEstablishment))).sort((left, right) => (
      left.localeCompare(right, undefined, { sensitivity: 'base' })
    ));
    dom.receivedDataEstablishmentFilter.innerHTML = `
      <option value="">All establishments</option>
      ${establishments.map((establishment) => `<option value="${escapeAttribute(establishment)}">${escapeHtml(establishment)}</option>`).join('')}
    `;
    if (establishments.includes(currentValue)) {
      dom.receivedDataEstablishmentFilter.value = currentValue;
    }
  }

  function clearReceivedDataFilters() {
    if (dom.receivedDataSearch) {
      dom.receivedDataSearch.value = '';
    }
    if (dom.receivedDataEstablishmentFilter) {
      dom.receivedDataEstablishmentFilter.value = '';
    }
    if (dom.receivedDataStatusFilter) {
      dom.receivedDataStatusFilter.value = '';
    }
    syncGlobalSearchFromPage();
    renderRecords();
  }

  function getSubmissionEstablishment(submission) {
    return String(submission?.submitted_by_office || '').trim() || 'No establishment';
  }

  function groupSubmissionsByEstablishment(submissions) {
    const groups = new Map();
    submissions.forEach((submission) => {
      const establishment = getSubmissionEstablishment(submission);
      if (!groups.has(establishment)) {
        groups.set(establishment, []);
      }
      groups.get(establishment).push(submission);
    });
    return Array.from(groups.entries())
      .map(([establishment, items]) => ({
        establishment,
        items: items.slice().sort((left, right) => new Date(right.updated_at || right.created_at || 0) - new Date(left.updated_at || left.created_at || 0)),
      }))
      .sort((left, right) => left.establishment.localeCompare(right.establishment, undefined, { sensitivity: 'base' }));
  }

  function buildReceivedDataGroupMarkup(group) {
    const openCount = group.items.filter((submission) => ['Pending', 'In Review', 'Needs Revision'].includes(submission.status)).length;
    const approvedCount = group.items.filter((submission) => submission.status === 'Approved').length;
    const latestDate = group.items.reduce((latest, submission) => {
      const candidate = new Date(submission.updated_at || submission.created_at || 0);
      return candidate > latest ? candidate : latest;
    }, new Date(0));

    return `
      <article class="data-received-group">
        <div class="data-received-group-head">
          <div>
            <h3>${escapeHtml(group.establishment)}</h3>
            <p>${group.items.length} received file(s) from this establishment.</p>
          </div>
          <div class="data-received-group-meta">
            <span class="mini-pill"><i class="fa-solid fa-hourglass-half"></i>${openCount} open</span>
            <span class="mini-pill"><i class="fa-solid fa-circle-check"></i>${approvedCount} approved</span>
            <span class="mini-pill"><i class="fa-solid fa-clock"></i>${formatDateTime(latestDate.toISOString())}</span>
          </div>
        </div>
        <div class="data-received-items">
          ${group.items.map((submission) => buildReceivedDataSubmissionMarkup(submission)).join('')}
        </div>
      </article>
    `;
  }

  function buildReceivedDataSubmissionMarkup(submission) {
    return `
      <div class="data-received-item">
        <div class="data-received-item-main">
          <strong>${escapeHtml(submission.original_filename || 'Untitled file')}</strong>
          <p>Sheet: ${escapeHtml(submission.sheet_name || 'Unknown sheet')} | Sent by ${escapeHtml(submission.submitted_by_name || 'Unknown user')} (${escapeHtml(submission.submitted_by_email || 'No email')})</p>
          ${submission.submission_notes ? `<p class="submission-note">${escapeHtml(submission.submission_notes)}</p>` : ''}
          ${buildSubmissionFeedbackMarkup(submission)}
          ${buildSubmissionMappingSummary(submission)}
          ${buildSubmissionLastActionMarkup(submission)}
          <div class="submission-meta">
            <span class="submission-status ${getIncomingDataStatusClass(submission.status)}">${escapeHtml(submission.status || 'Pending')}</span>
            <span class="mini-pill"><i class="fa-solid fa-file-excel"></i>${escapeHtml(getSubmissionFileTypeLabel(submission))}</span>
            <span class="mini-pill"><i class="fa-solid fa-code-branch"></i>${escapeHtml(submission.version_label || `v${submission.version_number || 1}`)}</span>
            <span class="mini-pill"><i class="fa-solid fa-table-list"></i>${submission.total_rows || 0} row(s)</span>
            <span class="mini-pill"><i class="fa-solid fa-clock"></i>${formatDateTime(submission.updated_at || submission.created_at)}</span>
          </div>
        </div>
        <div class="submission-actions">
          <button class="btn btn-secondary" type="button" data-action="load-submission-preview" data-id="${submission.id}"><i class="fa-solid fa-table"></i>Preview</button>
          ${submission.file_url ? `<a class="btn btn-ghost" href="${escapeHtml(submission.file_url)}" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-download"></i>Download</a>` : ''}
        </div>
      </div>
    `;
  }

  function renderVisitors() {
    const search = dom.visitorSearch.value.trim().toLowerCase();
    const statusValue = dom.visitorStatusFilter.value.trim();
    const filtered = state.visitors.filter((visitor) => {
      const matchesSearch = !search || [visitor.name, visitor.place, visitor.origin]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(search);
      const matchesStatus = !statusValue || visitor.status === statusValue;
      return matchesSearch && matchesStatus;
    });

    if (!filtered.length) {
      dom.visitorTable.innerHTML = buildEmptyTableRow(6, 'No visitor entries match your filters.');
      return;
    }

    dom.visitorTable.innerHTML = filtered.map((visitor) => buildVisitorRow(visitor)).join('');
  }

  function renderUsers() {
    if (!canViewUsers()) {
      dom.userTable.innerHTML = buildEmptyTableRow(7, 'Your role does not have permission to view user accounts.');
      return;
    }

    const search = dom.userSearch.value.trim().toLowerCase();
    const role = dom.userRoleFilter.value.trim();
    const statusValue = dom.userStatusFilter.value.trim();
    const filtered = state.users.filter((user) => {
      const matchesSearch = !search || [user.name, user.username, user.email, user.office, normalizeRoleValue(user.role), user.status]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(search);
      const matchesRole = !role || normalizeRoleValue(user.role) === role;
      const matchesStatus = !statusValue || user.status === statusValue;
      return matchesSearch && matchesRole && matchesStatus;
    });

    if (!filtered.length) {
      dom.userTable.innerHTML = buildEmptyTableRow(7, 'No users match your filters.');
      return;
    }

    dom.userTable.innerHTML = filtered.map((user) => buildUserRow(user)).join('');
  }

  function renderSendData() {
    if (!dom.sendDataList || canAccessAdminDashboard()) {
      return;
    }

    renderSendDataFileQueue();
    const submissions = state.dataSubmissions.filter((item) => Number(item.submitted_by) === Number(state.user?.id));
    const filteredSubmissions = getFilteredSendDataSubmissions(submissions);
    const draftCount = filteredSubmissions.filter((item) => item.status === 'Draft').length;
    dom.sendDataCount.innerHTML = `<i class="fa-solid fa-inbox"></i>${filteredSubmissions.length} item(s) | ${draftCount} draft(s)`;
    renderSendDataPreview();
    renderSendDataHistoryAnalytics(filteredSubmissions);

    if (!filteredSubmissions.length) {
      dom.sendDataList.innerHTML = buildSendDataEmptyState(
        submissions.length
          ? 'No submissions match your current history filters'
          : 'Upload your first CSV or Excel file to get started',
        submissions.length
          ? 'Try changing the status or date filters to bring matching drafts and reviewed files back into view.'
          : 'Once you save a draft or send a file, it will appear here with its latest review activity.'
      );
      return;
    }

    dom.sendDataList.innerHTML = filteredSubmissions.map((submission) => `
      <div class="list-item" data-submission-card-id="${submission.id}">
        <div>
          <strong>${escapeHtml(submission.original_filename)}</strong>
          <p>Sheet: ${escapeHtml(submission.sheet_name || 'Unknown')} | ${submission.total_rows} row(s) | ${submission.total_columns} column(s)</p>
          ${buildSubmissionLastActionMarkup(submission)}
          ${submission.submission_notes ? `<p class="submission-note">${escapeHtml(submission.submission_notes)}</p>` : ''}
          ${buildSubmissionFeedbackMarkup(submission)}
          ${buildSubmissionMappingSummary(submission)}
          <div class="submission-meta">
            <span class="submission-status ${getIncomingDataStatusClass(submission.status)}">${escapeHtml(submission.status)}</span>
            <span class="mini-pill"><i class="fa-solid fa-code-branch"></i>${escapeHtml(submission.version_label || `v${submission.version_number || 1}`)}</span>
            <span class="mini-pill"><i class="fa-solid fa-clock"></i>${formatDateTime(submission.updated_at || submission.created_at)}</span>
          </div>
        </div>
        <div class="submission-actions">
          ${submission.status === 'Draft'
            ? `<button class="btn btn-secondary" type="button" data-action="send-draft-submission" data-id="${submission.id}"><i class="fa-solid fa-paper-plane"></i>Send Draft</button>`
            : '<span class="submission-reviewed-pill"><i class="fa-solid fa-paper-plane"></i>Sent</span>'}
          ${submission.file_url ? `<a class="btn btn-ghost" href="${escapeHtml(submission.file_url)}" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-download"></i>Download</a>` : ''}
        </div>
      </div>
    `).join('');
  }

  function renderSendDataFileQueue() {
    if (!dom.sendDataFileQueue || !dom.sendDataQueueCount) {
      return;
    }

    const queuedEntries = state.sendDataFiles;
    const readyCount = queuedEntries.filter((entry) => entry.status === 'ready').length;
    dom.sendDataQueueCount.innerHTML = `<i class="fa-solid fa-layer-group"></i>${queuedEntries.length} queued | ${readyCount} ready`;
    updateSendDataSelectedFileSummary();

    if (!queuedEntries.length) {
      dom.sendDataFileQueue.innerHTML = buildSendDataEmptyState(
        'Upload your first CSV or Excel file to get started',
        'Drag one or more `.csv`, `.xls`, or `.xlsx` files into the upload box, or use the select button to build your queue.'
      );
      return;
    }

    dom.sendDataFileQueue.innerHTML = queuedEntries.map((entry) => {
      const isActive = entry.id === state.sendDataActiveFileId;
      const selectedCount = Array.isArray(entry.selectedSheets) ? entry.selectedSheets.length : 0;
      const statusLabel = entry.status === 'loading'
        ? 'Analyzing'
        : entry.status === 'error'
          ? 'Needs attention'
          : entry.status === 'ready'
            ? 'Ready'
            : 'Queued';
      const statusClass = entry.status === 'loading'
        ? 'is-in-review'
        : entry.status === 'error'
          ? 'is-rejected'
          : entry.status === 'ready'
            ? 'is-approved'
            : 'is-pending';
      const previewSummary = entry.preview
        ? `${entry.preview.total_rows} row(s) | ${entry.preview.total_columns} column(s)`
        : entry.status === 'loading'
          ? 'Preparing file preview...'
          : entry.error || 'Preview has not been prepared yet.';
      return `
        <div class="list-item send-data-queue-item ${isActive ? 'is-active' : ''} ${entry.status === 'error' ? 'is-error' : ''} ${entry.status === 'loading' ? 'is-loading' : ''}">
          <div>
            <strong>${escapeHtml(entry.file.name)}</strong>
            <p>${escapeHtml(previewSummary)}</p>
            ${entry.error ? `<p class="queue-error-text">${escapeHtml(entry.error)}</p>` : ''}
            ${buildSendDataQueueProgressMarkup(entry)}
            <div class="submission-meta">
              <span class="submission-status ${statusClass}">${escapeHtml(statusLabel)}</span>
              <span class="mini-pill"><i class="fa-solid fa-layer-group"></i>${selectedCount} selected sheet(s)</span>
              <span class="mini-pill"><i class="fa-solid fa-hard-drive"></i>${formatFileSize(entry.file.size || 0)}</span>
              ${isActive ? '<span class="mini-pill"><i class="fa-solid fa-eye"></i>Active preview</span>' : ''}
            </div>
          </div>
          <div class="submission-actions">
            <button class="btn btn-secondary" type="button" data-action="activate-send-data-file" data-id="${entry.id}"><i class="fa-solid fa-eye"></i>${isActive ? 'Viewing' : 'Open'}</button>
            ${entry.status === 'error'
              ? `<button class="btn btn-ghost" type="button" data-action="retry-send-data-file" data-id="${entry.id}"><i class="fa-solid fa-rotate-right"></i>Retry</button>`
              : ''}
            <button class="btn btn-danger" type="button" data-action="remove-send-data-file" data-id="${entry.id}"><i class="fa-solid fa-trash"></i>Remove</button>
          </div>
        </div>
      `;
    }).join('');
  }

  function getFilteredSendDataSubmissions(submissions) {
    const searchValue = dom.sendDataHistorySearch?.value.trim().toLowerCase() || '';
    const statusValue = dom.sendDataHistoryStatusFilter?.value.trim() || '';
    const dateFromValue = dom.sendDataHistoryDateFrom?.value || '';
    const dateToValue = dom.sendDataHistoryDateTo?.value || '';
    const dateFrom = dateFromValue ? new Date(`${dateFromValue}T00:00:00`) : null;
    const dateTo = dateToValue ? new Date(`${dateToValue}T23:59:59`) : null;

    return submissions.filter((submission) => {
      const createdAt = submission.created_at ? new Date(submission.created_at) : null;
      const searchableText = [
        submission.original_filename,
        submission.sheet_name,
        submission.status,
        submission.version_label || `v${submission.version_number || 1}`,
        submission.submission_notes,
        submission.admin_feedback,
        submission.last_reviewed_by_name,
      ].join(' ').toLowerCase();
      const matchesSearch = !searchValue || searchableText.includes(searchValue);
      const matchesStatus = !statusValue || submission.status === statusValue;
      const matchesFrom = !dateFrom || (createdAt && createdAt >= dateFrom);
      const matchesTo = !dateTo || (createdAt && createdAt <= dateTo);
      return matchesSearch && matchesStatus && matchesFrom && matchesTo;
    });
  }

  function renderSendDataHistoryAnalytics(submissions) {
    if (!dom.sendDataHistoryTotal) {
      return;
    }

    const totalSubmissions = submissions.length;
    const closedSubmissions = submissions.filter((submission) => ['Approved', 'Rejected'].includes(submission.status));
    const approvedCount = submissions.filter((submission) => submission.status === 'Approved').length;
    const approvalRate = closedSubmissions.length ? Math.round((approvedCount / closedSubmissions.length) * 100) : 0;
    const openCount = submissions.filter((submission) => ['Pending', 'In Review', 'Needs Revision'].includes(submission.status)).length;
    const draftCount = submissions.filter((submission) => submission.status === 'Draft').length;

    dom.sendDataHistoryTotal.textContent = String(totalSubmissions);
    dom.sendDataHistoryApprovalRate.textContent = `${approvalRate}%`;
    dom.sendDataHistoryOpen.textContent = String(openCount);
    dom.sendDataHistoryDrafts.textContent = String(draftCount);
  }

  function renderNotifications() {
    if (!dom.notificationList || !dom.notificationBadge || !dom.markAllNotificationsReadBtn) {
      return;
    }

    const notifications = Array.isArray(state.notifications) ? state.notifications : [];
    const unreadCount = notifications.filter((item) => !item.is_read).length;
    dom.notificationBtn?.setAttribute('aria-expanded', String(!dom.notificationPanel?.classList.contains('hidden')));
    dom.notificationBadge.textContent = unreadCount > 99 ? '99+' : String(unreadCount);
    toggleElement(dom.notificationBadge, unreadCount > 0);
    dom.markAllNotificationsReadBtn.disabled = unreadCount === 0;

    if (!notifications.length) {
      dom.notificationList.innerHTML = buildEmptyState('No submission updates yet.');
      return;
    }

    dom.notificationList.innerHTML = notifications.map((notification) => `
      <article class="notification-item ${notification.is_read ? '' : 'is-unread'}">
        <div>
          <strong>${escapeHtml(notification.title || 'Submission update')}</strong>
          <p>${escapeHtml(notification.message || 'A new update is available.')}</p>
          ${notification.created_by_name ? `<small>${escapeHtml(`From ${notification.created_by_name}`)}</small>` : ''}
        </div>
        <div class="notification-meta">
          ${notification.notification_type === 'Data Request' ? '<span class="mini-pill"><i class="fa-solid fa-bell"></i>Data request</span>' : ''}
          ${notification.notification_type === 'User Registration' ? '<span class="mini-pill"><i class="fa-solid fa-user-plus"></i>User registration</span>' : ''}
          ${notification.status_snapshot ? `<span class="submission-status ${getIncomingDataStatusClass(notification.status_snapshot)}">${escapeHtml(notification.status_snapshot)}</span>` : ''}
          ${notification.metadata && notification.metadata.due_date ? `<span class="mini-pill"><i class="fa-solid fa-calendar-day"></i>Due ${escapeHtml(notification.metadata.due_date)}</span>` : ''}
          <span class="mini-pill"><i class="fa-solid fa-clock"></i>${formatDateTime(notification.created_at)}</span>
        </div>
        <div class="notification-actions">
          ${notification.notification_type === 'Data Request'
            ? `<button class="btn btn-ghost" type="button" data-action="open-data-request" data-id="${notification.id}"><i class="fa-solid fa-paper-plane"></i>Open Send Data</button>`
            : notification.notification_type === 'User Registration'
              ? `<button class="btn btn-ghost" type="button" data-action="open-user-registration" data-id="${notification.id}"><i class="fa-solid fa-user-gear"></i>Open Users</button>`
              : notification.submission_id
                ? `<button class="btn btn-ghost" type="button" data-action="open-notification-submission" data-submission-id="${notification.submission_id}"><i class="fa-solid fa-file-lines"></i>Open Submission</button>`
                : ''}
          ${notification.is_read
            ? '<span class="submission-reviewed-pill"><i class="fa-solid fa-envelope-open"></i>Read</span>'
            : `<button class="btn btn-secondary" type="button" data-action="read-notification" data-id="${notification.id}"><i class="fa-solid fa-envelope-open-text"></i>Mark Read</button>`}
        </div>
      </article>
    `).join('');
  }

  function toggleNotificationPanel(event) {
    event?.stopPropagation();
    if (!dom.notificationPanel) {
      return;
    }

    const shouldOpen = dom.notificationPanel.classList.contains('hidden');
    toggleElement(dom.notificationPanel, shouldOpen);
    dom.notificationBtn?.setAttribute('aria-expanded', String(shouldOpen));
  }

  function closeNotificationPanel() {
    toggleElement(dom.notificationPanel, false);
    dom.notificationBtn?.setAttribute('aria-expanded', 'false');
  }

  function handleDocumentClick(event) {
    if (!dom.notificationPanel || dom.notificationPanel.classList.contains('hidden')) {
      return;
    }

    if (dom.notificationPanel.contains(event.target) || dom.notificationBtn?.contains(event.target)) {
      return;
    }

    closeNotificationPanel();
  }

  async function refreshNotificationsOnly() {
    if (!state.token) {
      return;
    }

    try {
      const notifications = await apiRequest('/submission-notifications/');
      state.notifications = Array.isArray(notifications) ? notifications : [];
      renderNotifications();
    } catch (error) {
      showToast('Notifications unavailable', error.message || 'Unable to load notifications right now.', 'fa-solid fa-bell');
    }
  }

  async function markNotificationRead(notificationId) {
    try {
      const updatedNotification = await apiRequest(`/submission-notifications/${notificationId}/read/`, {
        method: 'POST',
      });
      state.notifications = state.notifications.map((item) => (
        Number(item.id) === notificationId ? updatedNotification : item
      ));
      renderNotifications();
    } catch (error) {
      showToast('Notification error', extractErrorMessage(error), 'fa-solid fa-triangle-exclamation');
    }
  }

  async function markAllNotificationsRead() {
    if (!state.notifications.some((item) => !item.is_read)) {
      return;
    }

    try {
      await apiRequest('/submission-notifications/read-all/', {
        method: 'POST',
      });
      state.notifications = state.notifications.map((item) => ({
        ...item,
        is_read: true,
        read_at: item.read_at || new Date().toISOString(),
      }));
      renderNotifications();
      showToast('Notifications updated', 'All notifications were marked as read.');
    } catch (error) {
      showToast('Notification error', extractErrorMessage(error), 'fa-solid fa-triangle-exclamation');
    }
  }

  function handleNotificationListClick(event) {
    const readButton = event.target.closest('[data-action="read-notification"]');
    if (readButton) {
      const notificationId = Number(readButton.dataset.id);
      if (Number.isInteger(notificationId)) {
        markNotificationRead(notificationId);
      }
      return;
    }

    const dataRequestButton = event.target.closest('[data-action="open-data-request"]');
    if (dataRequestButton) {
      const notificationId = Number(dataRequestButton.dataset.id);
      const notification = state.notifications.find((item) => Number(item.id) === notificationId);
      if (notification && !notification.is_read) {
        markNotificationRead(notificationId);
      }
      closeNotificationPanel();
      switchPage('send-data');
      showToast('Data request opened', 'Choose a CSV or Excel file, then send it to the admin for review.', 'fa-solid fa-paper-plane');
      return;
    }

    const userRegistrationButton = event.target.closest('[data-action="open-user-registration"]');
    if (userRegistrationButton) {
      const notificationId = Number(userRegistrationButton.dataset.id);
      const notification = state.notifications.find((item) => Number(item.id) === notificationId);
      if (notification && !notification.is_read) {
        markNotificationRead(notificationId);
      }
      closeNotificationPanel();
      switchPage('users');
      showToast('User registration opened', 'Review pending accounts from the Users page.', 'fa-solid fa-user-plus');
      return;
    }

    const openButton = event.target.closest('[data-action="open-notification-submission"]');
    if (!openButton) {
      return;
    }

    const submissionId = Number(openButton.dataset.submissionId);
    if (!Number.isInteger(submissionId)) {
      return;
    }

    const relatedNotification = state.notifications.find((item) => Number(item.submission_id) === submissionId && !item.is_read);
    if (relatedNotification) {
      markNotificationRead(relatedNotification.id);
    }
    closeNotificationPanel();
    if (canAccessAdminDashboard()) {
      switchPage('incoming-data');
      openSubmissionPreview(submissionId);
      return;
    }
    switchPage('send-data');
  }

  function renderRecycle() {
    if (!canManageRecycle()) {
      dom.recycleTable.innerHTML = buildEmptyTableRow(4, 'Your role does not have permission to access the recycle bin.');
      return;
    }

    const search = dom.recycleSearch.value.trim().toLowerCase();
    const itemType = dom.recycleTypeFilter.value.trim().toLowerCase();
    const filtered = state.recycle.filter((item) => {
      const haystack = JSON.stringify(item.item_data || {}).toLowerCase();
      const matchesSearch = !search || haystack.includes(search) || String(item.item_type || '').toLowerCase().includes(search);
      const matchesType = !itemType || item.item_type === itemType;
      return matchesSearch && matchesType;
    });

    if (!filtered.length) {
      dom.recycleTable.innerHTML = buildEmptyTableRow(4, 'Recycle bin is empty or no items match your filters.');
      return;
    }

    dom.recycleTable.innerHTML = filtered.map((item) => buildRecycleRow(item)).join('');
  }

  function renderLogs() {
    if (!canManageUsers()) {
      dom.logsList.innerHTML = buildEmptyState('Only Super Admins can view activity logs.');
      return;
    }

    if (!state.logs.length) {
      dom.logsList.innerHTML = buildEmptyState('No activity logs available.');
      return;
    }

    dom.logsList.innerHTML = state.logs
      .map((log) => `
        <div class="list-item">
          <div>
            <strong>${escapeHtml(log.action || 'Activity')}</strong>
            <p>${escapeHtml(log.details || 'No details provided.')}</p>
            <small>${escapeHtml(log.user_name || log.user_username || 'System')} | ${formatDateTime(log.created_at)}</small>
          </div>
          <span class="mini-pill"><i class="fa-solid fa-server"></i>${escapeHtml(log.ip_address || 'local')}</span>
        </div>
      `)
      .join('');
  }

  function renderIncomingData() {
    if (!dom.incomingDataPanel || !canAccessAdminDashboard()) {
      return;
    }

    renderIncomingDataFilterOptions();
    renderIncomingDataSavedFilters();

    const openStatuses = ['Pending', 'In Review', 'Needs Revision'];
    const closedStatuses = ['Approved', 'Rejected'];
    const pendingCount = state.dataSubmissions.filter((submission) => openStatuses.includes(submission.status)).length;
    const reviewedCount = state.dataSubmissions.filter((submission) => closedStatuses.includes(submission.status)).length;
    const filterValues = getIncomingDataFilterValues();
    const filteredSubmissions = getFilteredIncomingDataSubmissions(filterValues);
    syncIncomingDataSelections();
    const hasFilters = hasIncomingDataFilterValues(filterValues);

    toggleElement(dom.incomingDataPanel, true);
    dom.incomingDataCount.innerHTML = `<i class="fa-solid fa-inbox"></i>${filteredSubmissions.length} shown`;
    if (dom.incomingDataPendingCount) {
      dom.incomingDataPendingCount.innerHTML = `<i class="fa-solid fa-hourglass-half"></i>${pendingCount} open`;
    }
    if (dom.incomingDataReviewedCount) {
      dom.incomingDataReviewedCount.innerHTML = `<i class="fa-solid fa-circle-check"></i>${reviewedCount} closed`;
    }
    renderIncomingDataBulkControls(filteredSubmissions);

    if (!filteredSubmissions.length) {
      dom.incomingDataList.innerHTML = buildEmptyState(
        hasFilters
          ? 'No Excel submissions match your current filters.'
          : 'No user-submitted CSV or Excel data yet.'
      );
      return;
    }

    const canReviewSubmissions = canApproveSubmissions();
    dom.incomingDataList.innerHTML = filteredSubmissions.map((submission) => `
      <div class="list-item incoming-data-item">
        <div class="incoming-data-selection">
          <input
            type="checkbox"
            class="incoming-data-checkbox"
            data-action="toggle-submission-selection"
            data-id="${submission.id}"
            ${state.incomingDataSelectedIds.includes(Number(submission.id)) ? 'checked' : ''}
          />
        </div>
        <div class="incoming-data-main">
          <div class="incoming-data-title-group">
            <strong>${escapeHtml(submission.original_filename)}</strong>
          </div>
          <p class="submission-subtitle">Sent by ${escapeHtml(submission.submitted_by_name || 'Unknown user')} (${escapeHtml(submission.submitted_by_email || 'No email')})</p>
          <p class="submission-subtitle">Sheet: ${escapeHtml(submission.sheet_name || 'Unknown sheet')}</p>
          ${buildSubmissionAuditSummaryMarkup(submission)}
          ${submission.submission_notes ? `<p class="submission-note">${escapeHtml(submission.submission_notes)}</p>` : ''}
          ${buildSubmissionFeedbackMarkup(submission)}
          ${buildSubmissionMappingSummary(submission)}
          ${buildSubmissionLastActionMarkup(submission)}
          <div class="submission-meta">
            <span class="submission-status ${getIncomingDataStatusClass(submission.status)}">${escapeHtml(submission.status || 'Pending')}</span>
            <span class="mini-pill"><i class="fa-solid fa-file-excel"></i>${escapeHtml(getSubmissionFileTypeLabel(submission))}</span>
            <span class="mini-pill"><i class="fa-solid fa-code-branch"></i>${escapeHtml(submission.version_label || `v${submission.version_number || 1}`)}</span>
            <span class="mini-pill"><i class="fa-solid fa-table-list"></i>${submission.total_rows} row(s)</span>
            <span class="mini-pill"><i class="fa-solid fa-table-columns"></i>${submission.total_columns} column(s)</span>
            <span class="mini-pill"><i class="fa-solid fa-clock"></i>${formatDateTime(submission.updated_at || submission.created_at)}</span>
          </div>
        </div>
        <div class="submission-actions incoming-data-actions">
          <div class="submission-primary-actions">
            <button class="btn btn-secondary" type="button" data-action="load-submission-preview" data-id="${submission.id}"><i class="fa-solid fa-table"></i>Preview</button>
            ${submission.file_url ? `<a class="btn btn-ghost" href="${escapeHtml(submission.file_url)}" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-download"></i>Download</a>` : ''}
          </div>
          ${canReviewSubmissions ? `
            <div class="submission-decision-actions">
              <button class="btn btn-success" type="button" data-action="quick-submission-status" data-status="Approved" data-id="${submission.id}"><i class="fa-solid fa-circle-check"></i>Approve</button>
              <button class="btn btn-secondary" type="button" data-action="quick-submission-status" data-status="In Review" data-id="${submission.id}"><i class="fa-solid fa-spinner"></i>In Review</button>
              <button class="btn btn-warning" type="button" data-action="quick-submission-status" data-status="Needs Revision" data-id="${submission.id}"><i class="fa-solid fa-rotate-left"></i>Revision</button>
              <button class="btn btn-danger" type="button" data-action="quick-submission-status" data-status="Rejected" data-id="${submission.id}"><i class="fa-solid fa-circle-xmark"></i>Reject</button>
            </div>
            <details class="submission-review-details">
              <summary>
                <span class="submission-review-summary-label"><i class="fa-solid fa-sliders"></i>Custom feedback</span>
                <span class="submission-review-summary-status ${getIncomingDataStatusClass(submission.status)}">${escapeHtml(submission.status || 'Pending')}</span>
              </summary>
              <div class="submission-review-controls">
                <div class="filter-box">
                  <i class="fa-solid fa-list-check"></i>
                  <select data-submission-status-id="${submission.id}">
                    ${buildSubmissionStatusOptions(submission.status)}
                  </select>
                </div>
                <textarea class="form-control" data-submission-feedback-id="${submission.id}" placeholder="Add admin feedback. This is required for Needs Revision or Rejected.">${escapeHtml(submission.admin_feedback || '')}</textarea>
                <p class="submission-review-help">Explain missing columns, formatting issues, or the next step for the user.</p>
                <button class="btn btn-success" type="button" data-action="save-submission-status" data-id="${submission.id}"><i class="fa-solid fa-floppy-disk"></i>Save Review</button>
              </div>
            </details>
          ` : `
            <div class="submission-readonly-note">
              <span class="mini-pill"><i class="fa-solid fa-eye"></i>Viewer mode</span>
              <p>You can inspect the file, history, and version changes, but only Super Admins and Reviewers can approve or edit it.</p>
            </div>
          `}
        </div>
      </div>
    `).join('');
  }

  function renderDataRequestPage() {
    if (!dom.dataRequestPageForm || !canApproveSubmissions()) {
      return;
    }

    const establishments = getActiveDataRequestEstablishments();
    if (dom.pageDataRequestEstablishments) {
      dom.pageDataRequestEstablishments.disabled = !establishments.length;
      dom.pageDataRequestEstablishments.innerHTML = establishments.length
        ? establishments.map((establishment) => `
            <option value="${escapeAttribute(establishment.name)}">
              ${escapeHtml(`${establishment.name} - ${establishment.count} active user${establishment.count === 1 ? '' : 's'}`)}
            </option>
          `).join('')
        : '<option value="" disabled>No active establishments available</option>';
    }
    if (dom.pageDataRequestDueDate && !dom.pageDataRequestDueDate.min) {
      dom.pageDataRequestDueDate.min = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    }
    if (dom.sendDataRequestPageBtn) {
      dom.sendDataRequestPageBtn.disabled = !establishments.length;
    }
  }

  function renderDataRequestHistory() {
    if (!dom.dataRequestHistoryTable) {
      return;
    }
    if (!canApproveSubmissions()) {
      dom.dataRequestHistoryTable.innerHTML = buildEmptyTableRow(6, 'Only Super Admins and Reviewers can view request history.');
      return;
    }

    const search = dom.dataRequestHistorySearch?.value.trim().toLowerCase() || '';
    const statusFilter = dom.dataRequestHistoryStatusFilter?.value.trim() || '';
    const history = (Array.isArray(state.dataRequestHistory) ? state.dataRequestHistory : []).filter((requestItem) => {
      const readStatus = requestItem.is_read ? 'Read' : 'Unread';
      const metadata = requestItem.metadata || {};
      const matchesSearch = !search || [
        requestItem.title,
        requestItem.message,
        requestItem.recipient_name,
        requestItem.recipient_email,
        requestItem.recipient_office,
        requestItem.created_by_name,
        metadata.due_date,
      ].filter(Boolean).join(' ').toLowerCase().includes(search);
      const matchesStatus = !statusFilter || readStatus === statusFilter;
      return matchesSearch && matchesStatus;
    });

    if (!history.length) {
      dom.dataRequestHistoryTable.innerHTML = buildEmptyTableRow(6, 'No request history matches your filters.');
      return;
    }

    dom.dataRequestHistoryTable.innerHTML = history.map((requestItem) => {
      const metadata = requestItem.metadata || {};
      const dueDate = metadata.due_date || '';
      const recipientLabel = requestItem.recipient_name || requestItem.recipient_email || `User #${requestItem.recipient}`;
      return `
        <tr>
          <td>
            <div class="cell-title">
              <strong>${escapeHtml(requestItem.title || 'Data request')}</strong>
              <small>${escapeHtml(requestItem.message || 'No request message recorded.')}</small>
            </div>
          </td>
          <td>
            <div class="cell-title">
              <strong>${escapeHtml(recipientLabel)}</strong>
              <small>${escapeHtml(requestItem.recipient_email || 'No email')}</small>
            </div>
          </td>
          <td>${escapeHtml(requestItem.recipient_office || '-')}</td>
          <td>${dueDate ? escapeHtml(dueDate) : '-'}</td>
          <td>
            <div class="cell-title">
              <strong>${formatDateTime(requestItem.created_at)}</strong>
              <small>Sent by ${escapeHtml(requestItem.created_by_name || 'Admin')}</small>
            </div>
          </td>
          <td><span class="submission-status ${requestItem.is_read ? 'is-approved' : 'is-pending'}">${requestItem.is_read ? 'Read' : 'Unread'}</span></td>
        </tr>
      `;
    }).join('');
  }

  function clearDataRequestHistoryFilters() {
    if (dom.dataRequestHistorySearch) {
      dom.dataRequestHistorySearch.value = '';
    }
    if (dom.dataRequestHistoryStatusFilter) {
      dom.dataRequestHistoryStatusFilter.value = '';
    }
    syncGlobalSearchFromPage();
    renderDataRequestHistory();
  }

  function syncIncomingDataSelections() {
    const availableIds = new Set(
      state.dataSubmissions
        .filter((submission) => submission.status !== 'Draft')
        .map((submission) => Number(submission.id))
        .filter((submissionId) => Number.isInteger(submissionId))
    );
    state.incomingDataSelectedIds = state.incomingDataSelectedIds.filter((submissionId) => availableIds.has(Number(submissionId)));
  }

  function renderIncomingDataBulkControls(filteredSubmissions) {
    const visibleIds = filteredSubmissions
      .map((submission) => Number(submission.id))
      .filter((submissionId) => Number.isInteger(submissionId));
    const selectedVisibleIds = visibleIds.filter((submissionId) => state.incomingDataSelectedIds.includes(submissionId));
    const selectedCount = state.incomingDataSelectedIds.length;

    if (dom.incomingDataSelectedCount) {
      dom.incomingDataSelectedCount.innerHTML = `<i class="fa-solid fa-check-double"></i>${selectedCount} selected`;
    }
    if (dom.incomingDataSelectAll) {
      dom.incomingDataSelectAll.checked = !!visibleIds.length && selectedVisibleIds.length === visibleIds.length;
      dom.incomingDataSelectAll.indeterminate = selectedVisibleIds.length > 0 && selectedVisibleIds.length < visibleIds.length;
      dom.incomingDataSelectAll.disabled = !visibleIds.length || state.incomingDataBatchProcessing;
    }
    if (dom.incomingDataBulkApproveBtn) {
      dom.incomingDataBulkApproveBtn.disabled = !canApproveSubmissions() || !selectedCount || state.incomingDataBatchProcessing;
    }
    if (dom.incomingDataBulkRejectBtn) {
      dom.incomingDataBulkRejectBtn.disabled = !canApproveSubmissions() || !selectedCount || state.incomingDataBatchProcessing;
    }
    if (dom.incomingDataBulkExportBtn) {
      dom.incomingDataBulkExportBtn.disabled = !canAccessAdminDashboard() || !selectedCount || state.incomingDataBatchProcessing;
    }
    if (dom.incomingDataBulkFeedback) {
      dom.incomingDataBulkFeedback.disabled = !canApproveSubmissions() || state.incomingDataBatchProcessing;
    }
    if (dom.incomingDataBulkStatus && !state.incomingDataBatchProcessing) {
      dom.incomingDataBulkStatus.innerHTML = selectedCount
        ? `<i class="fa-solid fa-layer-group"></i>Ready for ${selectedCount} selected file(s)`
        : '<i class="fa-solid fa-bolt"></i>No batch task running';
    }
  }

  function buildSubmissionStatusOptions(selectedStatus) {
    const statuses = ['Pending', 'In Review', 'Needs Revision', 'Approved', 'Rejected'];
    return statuses.map((statusValue) => `
      <option value="${statusValue}" ${selectedStatus === statusValue ? 'selected' : ''}>${statusValue}</option>
    `).join('');
  }

  function buildSubmissionFeedbackMarkup(submission) {
    if (!submission || !submission.admin_feedback) {
      return '';
    }
    return `
      <div class="submission-feedback">
        <strong>${['Needs Revision', 'Rejected'].includes(submission.status) ? 'Admin feedback' : 'Latest admin feedback'}</strong>
        <p>${escapeHtml(submission.admin_feedback)}</p>
      </div>
    `;
  }

  function buildSubmissionMappingSummary(submission) {
    const mappingProfileLabel = submission?.mapping_profile_label || '';
    const columnMapping = normalizeColumnMapping(submission?.column_mapping);
    const mappedFields = Object.keys(columnMapping);
    if (!mappingProfileLabel && !mappedFields.length) {
      return '';
    }

    return `
      <div class="submission-mapping-summary">
        ${mappingProfileLabel ? `<span class="mini-pill"><i class="fa-solid fa-wand-magic-sparkles"></i>${escapeHtml(mappingProfileLabel)}</span>` : ''}
        ${mappedFields.length ? `<span class="mini-pill"><i class="fa-solid fa-shuffle"></i>${mappedFields.length} mapped column(s)</span>` : ''}
      </div>
    `;
  }

  function buildSubmissionLastActionMarkup(submission) {
    if (!submission) {
      return '';
    }

    const actionTimestamp = submission.updated_at || submission.created_at;
    const actionLabel = getSubmissionLastActionLabel(submission.status);
    const exactTime = formatDateTime(actionTimestamp);
    const freshClass = isRecentTimestamp(actionTimestamp) ? 'is-fresh' : '';

    return `
      <div class="submission-last-action ${getIncomingDataStatusClass(submission.status)} ${freshClass}">
        <span class="submission-last-action-icon" aria-hidden="true">
          <i class="${escapeHtml(getSubmissionLastActionIcon(submission.status))}"></i>
        </span>
        <div class="submission-last-action-copy">
          <strong>${escapeHtml(`${actionLabel} ${timeAgoLong(actionTimestamp)}`)}</strong>
          <p>${escapeHtml(exactTime)}</p>
        </div>
      </div>
    `;
  }

  function buildSubmissionAuditSummaryMarkup(submission) {
    if (!submission) {
      return '';
    }

    const auditPills = [];
    const reviewerLabel = submission.last_reviewed_by_name || submission.last_reviewed_by_email || '';
    if (submission.is_high_priority) {
      auditPills.push('<span class="mini-pill submission-priority-pill"><i class="fa-solid fa-bell"></i>High priority</span>');
    }
    if (Number(submission.review_history_count) > 0) {
      auditPills.push(`<span class="mini-pill"><i class="fa-solid fa-timeline"></i>${Number(submission.review_history_count)} review event(s)</span>`);
    }
    if (reviewerLabel) {
      const reviewedMeta = submission.last_reviewed_at
        ? `${reviewerLabel} | ${timeAgoLong(submission.last_reviewed_at)}`
        : reviewerLabel;
      auditPills.push(`<span class="mini-pill"><i class="fa-solid fa-user-check"></i>${escapeHtml(reviewedMeta)}</span>`);
    }

    const priorityAlert = submission.is_high_priority
      ? `
        <div class="submission-priority-alert">
          <strong>Priority alert</strong>
          <p>${escapeHtml(submission.priority_reason || 'This file was flagged as urgent during upload.')}</p>
        </div>
      `
      : '';

    if (!priorityAlert && !auditPills.length) {
      return '';
    }

    return `
      ${priorityAlert}
      ${auditPills.length ? `<div class="submission-audit-meta">${auditPills.join('')}</div>` : ''}
    `;
  }

  function getSubmissionLastActionLabel(status) {
    if (status === 'Draft') {
      return 'Draft saved';
    }
    if (status === 'Pending') {
      return 'Sent to admin';
    }
    if (status === 'In Review') {
      return 'Marked in review';
    }
    if (status === 'Needs Revision') {
      return 'Revision requested';
    }
    if (status === 'Approved') {
      return 'Approved by admin';
    }
    if (status === 'Rejected') {
      return 'Rejected by admin';
    }
    return 'Updated';
  }

  function getSubmissionLastActionIcon(status) {
    if (status === 'Draft') {
      return 'fa-solid fa-floppy-disk';
    }
    if (status === 'Pending') {
      return 'fa-solid fa-paper-plane';
    }
    if (status === 'In Review') {
      return 'fa-solid fa-spinner';
    }
    if (status === 'Needs Revision') {
      return 'fa-solid fa-pen-to-square';
    }
    if (status === 'Approved') {
      return 'fa-solid fa-circle-check';
    }
    if (status === 'Rejected') {
      return 'fa-solid fa-circle-xmark';
    }
    return 'fa-solid fa-clock';
  }

  function buildSendDataQueueProgressMarkup(entry) {
    if (!entry || entry.status !== 'loading') {
      return '';
    }

    const progressPercent = Number.isFinite(entry.progress)
      ? Math.max(0, Math.min(100, Math.round(entry.progress * 100)))
      : null;
    const fillClassName = progressPercent == null
      ? 'send-data-queue-progress-fill is-indeterminate'
      : 'send-data-queue-progress-fill';
    const fillWidth = progressPercent == null ? '36%' : `${progressPercent}%`;

    return `
      <div class="send-data-queue-progress">
        <div class="send-data-queue-progress-track" aria-hidden="true">
          <span class="${fillClassName}" style="width: ${fillWidth};"></span>
        </div>
        <div class="send-data-queue-progress-meta">
          <small>${escapeHtml(entry.progressLabel || 'Uploading file...')}</small>
          <span>${progressPercent == null ? 'Working...' : `${progressPercent}%`}</span>
        </div>
      </div>
    `;
  }

  function getIncomingDataSavedFiltersStorageKey() {
    const userId = state.user && state.user.id != null ? String(state.user.id) : 'guest';
    return `citosis_incoming_saved_filters_${userId}`;
  }

  function getDefaultIncomingDataSavedFilters() {
    return [
      {
        id: 'incoming-preset-pending-this-week',
        name: 'Pending this week',
        preset_key: INCOMING_DATA_PRESET_PENDING_THIS_WEEK,
        is_system: true,
      },
    ];
  }

  function normalizeIncomingDataFilterPayload(payload = {}) {
    return {
      search: String(payload.search || '').trim(),
      status: String(payload.status || '').trim(),
      userId: String(payload.userId || payload.user_id || '').trim(),
      fileType: String(payload.fileType || payload.file_type || '').trim().toLowerCase(),
      dateFrom: String(payload.dateFrom || payload.date_from || '').trim(),
      dateTo: String(payload.dateTo || payload.date_to || '').trim(),
    };
  }

  function normalizeIncomingDataSavedFilterEntry(entry, index = 0) {
    if (!entry || typeof entry !== 'object') {
      return null;
    }

    const name = String(entry.name || '').trim();
    const presetKey = String(entry.preset_key || entry.presetKey || '').trim();
    const id = String(entry.id || `incoming-filter-${index + 1}`).trim();
    if (!name || !id) {
      return null;
    }

    return {
      id,
      name,
      preset_key: presetKey || '',
      filters: normalizeIncomingDataFilterPayload(entry.filters || {}),
      is_system: !!entry.is_system,
    };
  }

  function loadIncomingDataSavedFilters() {
    const defaultFilters = getDefaultIncomingDataSavedFilters();
    const storedFilters = parseStoredJson(safeStorageGet(localStorage, getIncomingDataSavedFiltersStorageKey()));
    const customFilters = Array.isArray(storedFilters)
      ? storedFilters
          .map((entry, index) => normalizeIncomingDataSavedFilterEntry(entry, index))
          .filter(Boolean)
          .map((entry) => ({ ...entry, is_system: false }))
      : [];

    state.incomingDataSavedFilters = [...defaultFilters, ...customFilters];
    if (!state.incomingDataSavedFilters.some((entry) => entry.id === state.incomingDataActiveSavedFilterId)) {
      state.incomingDataActiveSavedFilterId = '';
    }
    renderIncomingDataSavedFilters();
  }

  function persistIncomingDataSavedFilters() {
    if (!state.user || state.user.id == null) {
      return;
    }

    const payload = state.incomingDataSavedFilters
      .filter((entry) => !entry.is_system)
      .map((entry) => (
        entry.preset_key
          ? { id: entry.id, name: entry.name, preset_key: entry.preset_key }
          : { id: entry.id, name: entry.name, filters: entry.filters }
      ));
    safeStorageSet(localStorage, getIncomingDataSavedFiltersStorageKey(), JSON.stringify(payload));
  }

  function renderIncomingDataSavedFilters() {
    if (!dom.incomingDataSavedFiltersList) {
      return;
    }

    const savedFilters = Array.isArray(state.incomingDataSavedFilters) ? state.incomingDataSavedFilters : [];
    if (!savedFilters.length) {
      dom.incomingDataSavedFiltersList.innerHTML = buildEmptyState('Saved admin presets will appear here.');
    } else {
      dom.incomingDataSavedFiltersList.innerHTML = savedFilters.map((savedFilter) => {
        const isActive = state.incomingDataActiveSavedFilterId === savedFilter.id;
        const summary = buildIncomingDataSavedFilterSummary(savedFilter);
        return `
          <div class="saved-filter-chip-wrap ${isActive ? 'is-active' : ''}">
            <button
              class="saved-filter-chip ${isActive ? 'is-active' : ''}"
              type="button"
              data-action="apply-saved-incoming-filter"
              data-filter-id="${escapeAttribute(savedFilter.id)}"
              title="${escapeAttribute(summary)}"
            >
              <i class="fa-solid ${savedFilter.is_system ? 'fa-star' : 'fa-bookmark'}"></i>
              <span>${escapeHtml(savedFilter.name)}</span>
              ${savedFilter.is_system ? '<small>Suggested</small>' : ''}
            </button>
            ${savedFilter.is_system ? '' : `
              <button
                class="saved-filter-delete"
                type="button"
                aria-label="Delete ${escapeAttribute(savedFilter.name)}"
                data-action="delete-saved-incoming-filter"
                data-filter-id="${escapeAttribute(savedFilter.id)}"
              >
                <i class="fa-solid fa-xmark"></i>
              </button>
            `}
          </div>
        `;
      }).join('');
    }

    const activeFilter = savedFilters.find((entry) => entry.id === state.incomingDataActiveSavedFilterId);
    if (dom.incomingDataActiveFilterPill) {
      if (activeFilter) {
        dom.incomingDataActiveFilterPill.innerHTML = `<i class="fa-solid fa-bookmark"></i>${escapeHtml(activeFilter.name)}`;
        toggleElement(dom.incomingDataActiveFilterPill, true);
      } else {
        toggleElement(dom.incomingDataActiveFilterPill, false);
      }
    }
  }

  function buildIncomingDataSavedFilterSummary(savedFilter) {
    const resolvedFilters = resolveIncomingDataSavedFilter(savedFilter);
    const summaryParts = [];
    if (savedFilter && savedFilter.preset_key === INCOMING_DATA_PRESET_PENDING_THIS_WEEK) {
      summaryParts.push('Pending files received this week');
    }
    if (resolvedFilters.status) {
      summaryParts.push(resolvedFilters.status);
    }
    if (resolvedFilters.userId) {
      summaryParts.push(getIncomingDataUserLabel(resolvedFilters.userId));
    }
    if (resolvedFilters.fileType) {
      summaryParts.push(getIncomingDataFileTypeLabel(resolvedFilters.fileType));
    }
    if (resolvedFilters.dateFrom || resolvedFilters.dateTo) {
      summaryParts.push(`${resolvedFilters.dateFrom || 'Any start'} to ${resolvedFilters.dateTo || 'Any end'}`);
    }
    if (resolvedFilters.search) {
      summaryParts.push(`Search: ${resolvedFilters.search}`);
    }
    return summaryParts.join(' | ') || 'Saved admin filter';
  }

  function handleIncomingDataSavedFiltersClick(event) {
    const deleteButton = event.target.closest('[data-action="delete-saved-incoming-filter"]');
    if (deleteButton) {
      deleteIncomingDataSavedFilter(String(deleteButton.dataset.filterId || ''));
      return;
    }

    const applyButton = event.target.closest('[data-action="apply-saved-incoming-filter"]');
    if (!applyButton) {
      return;
    }
    applyIncomingDataSavedFilter(String(applyButton.dataset.filterId || ''));
  }

  function applyIncomingDataSavedFilter(filterId) {
    const savedFilter = state.incomingDataSavedFilters.find((entry) => entry.id === filterId);
    if (!savedFilter) {
      return;
    }

    setIncomingDataFilterValues(resolveIncomingDataSavedFilter(savedFilter));
    state.incomingDataActiveSavedFilterId = savedFilter.id;
    if (dom.incomingDataSavedFilterName) {
      dom.incomingDataSavedFilterName.value = savedFilter.name;
    }
    renderIncomingData();
  }

  function deleteIncomingDataSavedFilter(filterId) {
    const savedFilter = state.incomingDataSavedFilters.find((entry) => entry.id === filterId);
    if (!savedFilter || savedFilter.is_system) {
      return;
    }

    state.incomingDataSavedFilters = state.incomingDataSavedFilters.filter((entry) => entry.id !== filterId);
    if (state.incomingDataActiveSavedFilterId === filterId) {
      state.incomingDataActiveSavedFilterId = '';
    }
    persistIncomingDataSavedFilters();
    renderIncomingDataSavedFilters();
    showToast('Saved filter removed', `${savedFilter.name} has been deleted from your admin presets.`);
  }

  function saveCurrentIncomingDataFilter() {
    const filterName = dom.incomingDataSavedFilterName?.value.trim() || '';
    if (!filterName) {
      dom.incomingDataSavedFilterName?.focus();
      showToast('Name required', 'Add a name before saving this admin filter.', 'fa-solid fa-bookmark');
      return;
    }

    const currentFilters = getIncomingDataFilterValues();
    if (!hasIncomingDataFilterValues(currentFilters)) {
      showToast('Nothing to save', 'Choose at least one search or filter value before saving a preset.', 'fa-solid fa-filter');
      return;
    }

    const existingFilter = state.incomingDataSavedFilters.find((entry) => entry.name.toLowerCase() === filterName.toLowerCase());
    if (existingFilter && existingFilter.is_system) {
      showToast('Preset already exists', 'That suggested preset is already available. Use it directly or choose a different name.', 'fa-solid fa-star');
      return;
    }

    const nextFilter = {
      id: existingFilter ? existingFilter.id : createIncomingDataSavedFilterId(),
      name: filterName,
      filters: currentFilters,
      preset_key: '',
      is_system: false,
    };

    state.incomingDataSavedFilters = [
      ...state.incomingDataSavedFilters.filter((entry) => entry.id !== nextFilter.id),
      nextFilter,
    ];
    state.incomingDataActiveSavedFilterId = nextFilter.id;
    persistIncomingDataSavedFilters();
    renderIncomingDataSavedFilters();
    if (dom.incomingDataSavedFilterName) {
      dom.incomingDataSavedFilterName.value = '';
    }
    showToast('Filter saved', `${nextFilter.name} is ready to reuse from Saved filters.`);
  }

  function createIncomingDataSavedFilterId() {
    return `incoming-filter-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function handleIncomingDataFiltersChanged() {
    state.incomingDataActiveSavedFilterId = '';
    renderIncomingData();
  }

  function clearIncomingDataFilters(event) {
    event?.preventDefault();
    setIncomingDataFilterValues({});
    state.incomingDataActiveSavedFilterId = '';
    renderIncomingData();
  }

  function getIncomingDataFilterValues() {
    return normalizeIncomingDataFilterPayload({
      search: dom.incomingDataSearch?.value,
      status: dom.incomingDataStatusFilter?.value,
      userId: dom.incomingDataUserFilter?.value,
      fileType: dom.incomingDataFileTypeFilter?.value,
      dateFrom: dom.incomingDataDateFrom?.value,
      dateTo: dom.incomingDataDateTo?.value,
    });
  }

  function setIncomingDataFilterValues(filterValues = {}) {
    const normalizedFilters = normalizeIncomingDataFilterPayload(filterValues);
    if (dom.incomingDataSearch) {
      dom.incomingDataSearch.value = normalizedFilters.search;
    }
    if (dom.incomingDataStatusFilter) {
      dom.incomingDataStatusFilter.value = normalizedFilters.status;
    }
    if (dom.incomingDataUserFilter) {
      dom.incomingDataUserFilter.value = normalizedFilters.userId;
    }
    if (dom.incomingDataFileTypeFilter) {
      dom.incomingDataFileTypeFilter.value = normalizedFilters.fileType;
    }
    if (dom.incomingDataDateFrom) {
      dom.incomingDataDateFrom.value = normalizedFilters.dateFrom;
    }
    if (dom.incomingDataDateTo) {
      dom.incomingDataDateTo.value = normalizedFilters.dateTo;
    }
  }

  function hasIncomingDataFilterValues(filterValues = getIncomingDataFilterValues()) {
    return Object.values(filterValues).some((value) => !!String(value || '').trim());
  }

  function resolveIncomingDataSavedFilter(savedFilter) {
    if (savedFilter && savedFilter.preset_key === INCOMING_DATA_PRESET_PENDING_THIS_WEEK) {
      return buildPendingThisWeekIncomingDataFilters();
    }
    return normalizeIncomingDataFilterPayload(savedFilter && savedFilter.filters ? savedFilter.filters : {});
  }

  function buildPendingThisWeekIncomingDataFilters() {
    const startOfWeek = getStartOfWeekDate(new Date());
    const endOfWeek = getEndOfWeekDate(new Date());
    return normalizeIncomingDataFilterPayload({
      status: 'Pending',
      dateFrom: formatDateInputValue(startOfWeek),
      dateTo: formatDateInputValue(endOfWeek),
    });
  }

  function getStartOfWeekDate(inputDate) {
    const date = new Date(inputDate);
    const day = date.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    date.setDate(date.getDate() + diff);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  function getEndOfWeekDate(inputDate) {
    const date = getStartOfWeekDate(inputDate);
    date.setDate(date.getDate() + 6);
    date.setHours(23, 59, 59, 999);
    return date;
  }

  function formatDateInputValue(value) {
    if (!value) {
      return '';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function renderIncomingDataFilterOptions() {
    renderIncomingDataUserFilterOptions();
    renderIncomingDataFileTypeFilterOptions();
  }

  function renderIncomingDataUserFilterOptions() {
    if (!dom.incomingDataUserFilter) {
      return;
    }

    const currentValue = dom.incomingDataUserFilter.value || '';
    const userOptions = getIncomingDataUserFilterOptions();
    if (currentValue && !userOptions.some((option) => option.value === currentValue)) {
      userOptions.unshift({
        value: currentValue,
        label: getIncomingDataUserLabel(currentValue),
      });
    }
    dom.incomingDataUserFilter.innerHTML = buildIncomingDataSelectOptionsMarkup(userOptions, 'All admins and users');
    dom.incomingDataUserFilter.value = currentValue;
  }

  function renderIncomingDataFileTypeFilterOptions() {
    if (!dom.incomingDataFileTypeFilter) {
      return;
    }

    const currentValue = (dom.incomingDataFileTypeFilter.value || '').toLowerCase();
    const fileTypeOptions = getIncomingDataFileTypeOptions();
    if (currentValue && !fileTypeOptions.some((option) => option.value === currentValue)) {
      fileTypeOptions.unshift({
        value: currentValue,
        label: getIncomingDataFileTypeLabel(currentValue),
      });
    }
    dom.incomingDataFileTypeFilter.innerHTML = buildIncomingDataSelectOptionsMarkup(fileTypeOptions, 'All file types');
    dom.incomingDataFileTypeFilter.value = currentValue;
  }

  function buildIncomingDataSelectOptionsMarkup(options, defaultLabel) {
    return [
      `<option value="">${escapeHtml(defaultLabel)}</option>`,
      ...options.map((option) => `<option value="${escapeAttribute(option.value)}">${escapeHtml(option.label)}</option>`),
    ].join('');
  }

  function getIncomingDataUserFilterOptions() {
    const seenUsers = new Map();
    state.dataSubmissions.forEach((submission) => {
      const userId = submission && submission.submitted_by != null ? String(submission.submitted_by) : '';
      if (!userId || seenUsers.has(userId)) {
        return;
      }
      const name = submission.submitted_by_name || submission.submitted_by_email || `User ${userId}`;
      const email = submission.submitted_by_email ? ` (${submission.submitted_by_email})` : '';
      seenUsers.set(userId, {
        value: userId,
        label: `${name}${email}`,
      });
    });
    return Array.from(seenUsers.values()).sort((left, right) => left.label.localeCompare(right.label));
  }

  function getIncomingDataUserLabel(userId) {
    const option = getIncomingDataUserFilterOptions().find((entry) => entry.value === String(userId));
    return option ? option.label : `User #${userId}`;
  }

  function getIncomingDataFileTypeOptions() {
    return Array.from(new Set(
      state.dataSubmissions
        .map((submission) => getSubmissionFileType(submission))
        .filter(Boolean)
    ))
      .sort()
      .map((fileType) => ({
        value: fileType,
        label: getIncomingDataFileTypeLabel(fileType),
      }));
  }

  function getSubmissionFileType(submission) {
    const filename = String(submission && submission.original_filename ? submission.original_filename : '').trim().toLowerCase();
    const match = filename.match(/\.([a-z0-9]+)$/i);
    return match ? match[1].toLowerCase() : '';
  }

  function getIncomingDataFileTypeLabel(fileType) {
    return getSubmissionFileTypeLabel(fileType);
  }

  function getSubmissionFileTypeLabel(submissionOrFileType) {
    const fileType = typeof submissionOrFileType === 'string'
      ? submissionOrFileType.toLowerCase()
      : getSubmissionFileType(submissionOrFileType);
    return fileType ? fileType.toUpperCase() : 'Unknown';
  }

  function getFilteredIncomingDataSubmissions(filterOverrides = null) {
    const filters = filterOverrides || getIncomingDataFilterValues();
    const search = filters.search.toLowerCase();
    const statusValue = filters.status;
    const userId = filters.userId;
    const fileType = filters.fileType;
    const dateFrom = filters.dateFrom ? new Date(`${filters.dateFrom}T00:00:00`) : null;
    const dateTo = filters.dateTo ? new Date(`${filters.dateTo}T23:59:59.999`) : null;

    return state.dataSubmissions.filter((submission) => {
      const createdAt = submission.created_at ? new Date(submission.created_at) : null;
      const haystack = [
        submission.original_filename,
        submission.sheet_name,
        submission.submitted_by_name,
        submission.submitted_by_email,
        submission.submission_notes,
        submission.admin_feedback,
        submission.priority_reason,
        submission.last_reviewed_by_name,
        submission.last_reviewed_by_email,
        submission.version_label,
        submission.status,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      const matchesSearch = !search || haystack.includes(search);
      const matchesStatus = !statusValue || submission.status === statusValue;
      const matchesUser = !userId || String(submission.submitted_by) === userId;
      const matchesFileType = !fileType || getSubmissionFileType(submission) === fileType;
      const matchesFrom = !dateFrom || (createdAt && createdAt >= dateFrom);
      const matchesTo = !dateTo || (createdAt && createdAt <= dateTo);
      return matchesSearch && matchesStatus && matchesUser && matchesFileType && matchesFrom && matchesTo;
    });
  }

  function getIncomingDataStatusClass(status) {
    if (status === 'Draft') {
      return 'is-draft';
    }
    if (status === 'In Review') {
      return 'is-in-review';
    }
    if (status === 'Needs Revision') {
      return 'is-needs-revision';
    }
    if (status === 'Approved') {
      return 'is-approved';
    }
    if (status === 'Rejected') {
      return 'is-rejected';
    }
    return 'is-pending';
  }

  function updateBadges() {
    if (dom.badgeRecords) {
      dom.badgeRecords.textContent = String(canAccessAdminDashboard() ? state.dataSubmissions.length : state.records.length);
    }
    if (dom.badgeIncomingData) {
      const openSubmissionCount = state.dataSubmissions.filter((submission) => !['Approved', 'Rejected'].includes(String(submission.status || '').trim())).length;
      dom.badgeIncomingData.textContent = String(openSubmissionCount);
    }
    if (dom.badgeRequestHistory) {
      dom.badgeRequestHistory.textContent = String(Array.isArray(state.dataRequestHistory) ? state.dataRequestHistory.length : 0);
    }
    dom.badgeVisitors.textContent = String(state.visitors.length);
    dom.badgeUsers.textContent = String(state.users.length);
    dom.badgeRecycle.textContent = String(state.recycle.length);
    if (dom.badgeSentData) {
      const ownSubmissions = state.dataSubmissions.filter((submission) => (
        !state.user || Number(submission.submitted_by) === Number(state.user.id)
      ));
      dom.badgeSentData.textContent = String(ownSubmissions.length);
    }
  }

  function updateCurrentAccountIdentity() {
    const user = state.user;
    const hasUser = !!user;
    const displayName = hasUser
      ? (user.name || user.username || user.email || `User #${user.id}`)
      : 'Signed out';
    const role = hasUser ? (normalizeRoleValue(user.role) || 'User') : 'No role';
    const userId = hasUser && user.id ? `ID #${user.id}` : '';
    const username = hasUser && user.username ? `@${user.username}` : '';
    const email = hasUser && user.email ? user.email : '';
    const topIdentifier = [role, username || email || userId].filter(Boolean).join(' - ') || 'No account';
    const sidebarId = userId || 'No ID';
    const initials = hasUser ? buildAccountInitials(displayName) : '?';

    if (dom.accountAvatar) {
      dom.accountAvatar.innerHTML = buildAccountAvatarMarkup(user, initials);
    }
    if (dom.accountName) {
      dom.accountName.textContent = displayName;
    }
    if (dom.accountIdentifier) {
      dom.accountIdentifier.textContent = topIdentifier;
    }
    if (dom.accountChip) {
      dom.accountChip.title = hasUser ? `Edit profile - ${displayName} - ${role} - ${sidebarId}${email ? ` - ${email}` : ''}` : 'No account signed in';
      dom.accountChip.classList.toggle('is-super-admin', role === 'Super Admin');
    }
    if (dom.sidebarAccountAvatar) {
      dom.sidebarAccountAvatar.innerHTML = buildAccountAvatarMarkup(user, initials);
    }
    if (dom.sidebarAccountName) {
      dom.sidebarAccountName.textContent = displayName;
    }
    if (dom.sidebarAccountRole) {
      dom.sidebarAccountRole.textContent = role;
    }
    if (dom.sidebarAccountMeta) {
      dom.sidebarAccountMeta.textContent = sidebarId;
    }
    if (dom.sidebarAccountEmail) {
      dom.sidebarAccountEmail.textContent = email || 'No email available';
    }
    if (dom.sidebarAccount) {
      dom.sidebarAccount.title = hasUser ? `Edit profile - ${displayName}` : 'No account signed in';
      dom.sidebarAccount.classList.toggle('is-super-admin', role === 'Super Admin');
    }
  }

  function buildAccountAvatarMarkup(user, initials) {
    const imageUrl = user && (user.profile_picture_url || user.profile_picture);
    if (imageUrl) {
      return `<img src="${escapeAttribute(imageUrl)}" alt="${escapeAttribute(user.name || user.username || 'Profile picture')}">`;
    }
    return escapeHtml(initials);
  }

  function buildAccountInitials(value) {
    const parts = String(value || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
    }
    const compact = String(value || '?').trim().replace(/[^a-z0-9]/gi, '');
    return (compact || '?').slice(0, 2).toUpperCase();
  }

  function updateUiForRole() {
    updateCurrentAccountIdentity();
    const canAdminDashboard = canAccessAdminDashboard();
    const canUsers = canViewUsers();
    const canCreateUsers = canManageUsers();
    const canRecycle = canManageRecycle();
    const canClearLogsValue = canManageRecycle();
    const canEdit = canEditData();
    const canRequestData = canApproveSubmissions();

    toggleElement(dom.addUserBtn, canCreateUsers);
    toggleElement(dom.addRecordBtn, false);
    toggleElement(dom.addVisitorBtn, canEdit);
    toggleElement(dom.uploadExcelBtn, canEdit);
    dom.quickAddButtons.forEach((button) => {
      if (button.dataset.quickAdd === 'user') {
        toggleElement(button, canCreateUsers);
      }
      if (button.dataset.quickAdd === 'record' || button.dataset.quickAdd === 'visitor') {
        toggleElement(button, canEdit);
      }
    });
    toggleElement(dom.emptyRecycleBtn, canRecycle);
    toggleElement(dom.clearLogsBtn, canClearLogsValue);
    toggleElement(dom.excelPreviewPanel, canAdminDashboard);
    toggleElement(dom.incomingDataPanel, canAdminDashboard);
    toggleElement(dom.requestDataBtn, canRequestData);
    toggleElement(dom.requestDataFromHistoryBtn, canRequestData);
    toggleElement(dom.refreshDataRequestTargetsBtn, canRequestData);
    toggleElement(dom.sendDataRequestPageBtn, canRequestData);
    if (dom.incomingDataBulkApproveBtn) {
      toggleElement(dom.incomingDataBulkApproveBtn, canRequestData);
    }
    if (dom.incomingDataBulkRejectBtn) {
      toggleElement(dom.incomingDataBulkRejectBtn, canRequestData);
    }
    if (dom.incomingDataBulkFeedback) {
      const bulkFeedbackField = dom.incomingDataBulkFeedback.closest('.field');
      if (bulkFeedbackField) {
        toggleElement(bulkFeedbackField, canRequestData);
      }
    }

    dom.navButtons.forEach((button) => {
      if (button.dataset.page === 'dashboard') {
        button.classList.toggle('hidden', !canAdminDashboard);
      }
      if (button.dataset.page === 'incoming-data') {
        button.classList.toggle('hidden', !canAdminDashboard);
      }
      if (button.dataset.page === 'request-data') {
        button.classList.toggle('hidden', !canRequestData);
      }
      if (button.dataset.page === 'request-history') {
        button.classList.toggle('hidden', !canRequestData);
      }
      if (button.dataset.page === 'template') {
        button.classList.remove('hidden');
      }
      if (button.dataset.page === 'send-data') {
        button.classList.toggle('hidden', canAdminDashboard);
      }
      if (button.dataset.page === 'sent-data') {
        button.classList.toggle('hidden', canAdminDashboard);
      }
      if (button.dataset.page === 'records') {
        button.classList.toggle('hidden', !canAdminDashboard);
      }
      if (button.dataset.page === 'users') {
        button.classList.toggle('hidden', !canUsers && !canCreateUsers);
      }
      if (button.dataset.page === 'recycle') {
        button.classList.toggle('hidden', !canRecycle);
      }
      if (button.dataset.page === 'logs') {
        button.classList.toggle('hidden', !canCreateUsers);
      }
    });
    updateRealtimeIncomingDataPolling();
  }

  function createSendDataFileEntry(file) {
    return {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      key: `${file.name}::${file.size}::${file.lastModified}`,
      file,
      preview: null,
      selectedSheets: [],
      sheetConfigs: {},
      notes: '',
      status: 'queued',
      error: '',
      progress: null,
      progressLabel: '',
    };
  }

  function setSendDataEntryProgress(entry, progress, label = '') {
    if (!entry) {
      return;
    }

    entry.progress = Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : null;
    entry.progressLabel = String(label || '').trim();
  }

  function isValidDataUploadFile(file) {
    const lowerName = String(file?.name || '').toLowerCase();
    return lowerName.endsWith('.csv') || lowerName.endsWith('.xls') || lowerName.endsWith('.xlsx');
  }

  function getSendDataFileEntry(fileId = state.sendDataActiveFileId) {
    return state.sendDataFiles.find((entry) => entry.id === fileId) || null;
  }

  function getActiveSendDataFileEntry() {
    return getSendDataFileEntry(state.sendDataActiveFileId);
  }

  function syncSendDataStateFromActiveFile() {
    const activeEntry = getActiveSendDataFileEntry();
    if (!activeEntry) {
      state.sendDataFile = null;
      state.sendDataPreview = null;
      state.sendDataSelectedSheets = [];
      state.sendDataSheetConfigs = {};
      if (dom.sendDataNotes) {
        dom.sendDataNotes.value = '';
      }
      if (dom.sendDataPreviewSearch) {
        dom.sendDataPreviewSearch.value = '';
      }
      updateSendDataSelectedFileSummary();
      return;
    }

    state.sendDataFile = activeEntry.file;
    state.sendDataPreview = activeEntry.preview;
    state.sendDataSelectedSheets = activeEntry.selectedSheets;
    state.sendDataSheetConfigs = activeEntry.sheetConfigs;
    if (dom.sendDataNotes) {
      dom.sendDataNotes.value = activeEntry.notes || '';
    }
    if (dom.sendDataPreviewSearch) {
      dom.sendDataPreviewSearch.value = activeEntry.preview?.search || '';
    }
    updateSendDataSelectedFileSummary();
  }

  function persistActiveSendDataState() {
    const activeEntry = getActiveSendDataFileEntry();
    if (!activeEntry) {
      return;
    }

    activeEntry.preview = state.sendDataPreview;
    activeEntry.selectedSheets = Array.isArray(state.sendDataSelectedSheets) ? state.sendDataSelectedSheets.slice() : [];
    activeEntry.sheetConfigs = { ...(state.sendDataSheetConfigs || {}) };
    activeEntry.notes = getSendDataNotes();
  }

  function updateSendDataSelectedFileSummary() {
    if (!dom.sendDataSelectedFile) {
      return;
    }

    const totalQueued = state.sendDataFiles.length;
    const activeEntry = getActiveSendDataFileEntry();
    if (!totalQueued) {
      dom.sendDataSelectedFile.innerHTML = '<i class="fa-solid fa-file-lines"></i>Upload your first CSV or Excel file';
      return;
    }

    if (!activeEntry) {
      dom.sendDataSelectedFile.innerHTML = `<i class="fa-solid fa-file-lines"></i>${totalQueued} file(s) queued`;
      return;
    }

    dom.sendDataSelectedFile.innerHTML = `<i class="fa-solid fa-file-lines"></i>${totalQueued} queued | Active: ${escapeHtml(activeEntry.file.name)}`;
  }

  function setActiveSendDataFile(fileId) {
    if (!getSendDataFileEntry(fileId)) {
      return;
    }
    state.sendDataActiveFileId = fileId;
    syncSendDataStateFromActiveFile();
    renderSendData();
  }

  function removeSendDataFile(fileId) {
    const existingIndex = state.sendDataFiles.findIndex((entry) => entry.id === fileId);
    if (existingIndex < 0) {
      return;
    }

    const wasActive = state.sendDataActiveFileId === fileId;
    state.sendDataFiles.splice(existingIndex, 1);
    if (!state.sendDataFiles.length) {
      state.sendDataActiveFileId = null;
    } else if (wasActive) {
      const fallbackEntry = state.sendDataFiles[Math.min(existingIndex, state.sendDataFiles.length - 1)];
      state.sendDataActiveFileId = fallbackEntry?.id || null;
    }
    syncSendDataStateFromActiveFile();
    renderSendData();
  }

  async function addSendDataFiles(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) {
      return;
    }

    setSendDataError('');
    setSendDataSuccess('');

    const invalidFiles = [];
    const duplicateFiles = [];
    const newEntries = [];

    files.forEach((file) => {
      if (!isValidDataUploadFile(file)) {
        invalidFiles.push(file.name || 'Unnamed file');
        return;
      }

      const entryKey = `${file.name}::${file.size}::${file.lastModified}`;
      if (state.sendDataFiles.some((entry) => entry.key === entryKey) || newEntries.some((entry) => entry.key === entryKey)) {
        duplicateFiles.push(file.name || 'Unnamed file');
        return;
      }

      newEntries.push(createSendDataFileEntry(file));
    });

    if (!newEntries.length) {
      if (invalidFiles.length || duplicateFiles.length) {
        setSendDataError(buildSendDataQueueIssueMessage(invalidFiles, duplicateFiles));
      }
      return;
    }

    state.sendDataFiles.push(...newEntries);
    if (!state.sendDataActiveFileId) {
      state.sendDataActiveFileId = newEntries[0].id;
    }
    syncSendDataStateFromActiveFile();
    renderSendData();

    setSendDataLoading(true, 'preview');
    try {
      for (const [index, entry] of newEntries.entries()) {
        await previewSendDataFile('', entry.id, {
          progressIndex: index + 1,
          progressTotal: newEntries.length,
          skipLoadingToggle: true,
        });
      }
    } finally {
      setSendDataLoading(false, 'preview');
    }

    if (invalidFiles.length || duplicateFiles.length) {
      setSendDataError(buildSendDataQueueIssueMessage(invalidFiles, duplicateFiles));
    } else {
      setSendDataSuccess(`${newEntries.length} CSV/Excel file(s) added to the upload queue.`);
    }
  }

  function buildSendDataQueueIssueMessage(invalidFiles, duplicateFiles) {
    const messages = [];
    if (invalidFiles.length) {
      messages.push(`Skipped unsupported file(s): ${invalidFiles.join(', ')}. Use .csv, .xls, or .xlsx.`);
    }
    if (duplicateFiles.length) {
      messages.push(`Skipped duplicate queued file(s): ${duplicateFiles.join(', ')}.`);
    }
    return messages.join(' ');
  }

  function handleExcelUploadClick() {
    if (!canEditData()) {
      showToast('Access denied', 'Only Super Admins and Reviewers can upload CSV or Excel files in the dashboard.', 'fa-solid fa-lock');
      return;
    }
    dom.excelFileInput?.click();
  }

  function handleExcelFileSelected(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) {
      return;
    }
    const lowerName = file.name.toLowerCase();
    if (!isValidDataUploadFile(file)) {
      setExcelPreviewError('Invalid file format. Please choose a .csv, .xls, or .xlsx file.');
      dom.excelFileInput.value = '';
      return;
    }
    uploadExcelPreview(file);
  }

  async function uploadExcelPreview(file) {
    setExcelPreviewLoading(true);
    setExcelPreviewError('');
    toggleElement(dom.excelPreviewContent, false);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const payload = await apiRequest('/dashboard/excel-preview/', {
        method: 'POST',
        body: formData,
      });
      state.excelPreview = {
        ...payload,
        search: '',
        sortIndex: null,
        sortDirection: 'asc',
        currentPage: 1,
        pageSize: 25,
      };
      dom.excelPreviewSearch.value = '';
      renderExcelPreview();
      showToast('Preview ready', `${payload.file_name} has been loaded into the dashboard.`);
    } catch (error) {
      state.excelPreview = null;
      renderExcelPreview();
      setExcelPreviewError(extractErrorMessage(error));
    } finally {
      setExcelPreviewLoading(false);
      if (dom.excelFileInput) {
        dom.excelFileInput.value = '';
      }
    }
  }

  function clearExcelPreview() {
    state.excelPreview = null;
    if (dom.excelPreviewSearch) {
      dom.excelPreviewSearch.value = '';
    }
    if (dom.excelFileInput) {
      dom.excelFileInput.value = '';
    }
    setExcelPreviewError('');
    setExcelPreviewLoading(false);
    renderExcelPreview();
  }

  function handleSendDataSelectClick() {
    dom.sendDataFileInput?.click();
  }

  function handleSendDataFileSelected(event) {
    const files = event.target.files ? Array.from(event.target.files) : [];
    addSendDataFiles(files);
    if (dom.sendDataFileInput) {
      dom.sendDataFileInput.value = '';
    }
  }

  function handleSendDataDropzoneKeydown(event) {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }
    event.preventDefault();
    handleSendDataSelectClick();
  }

  function handleSendDataDropzoneDragEnter(event) {
    event.preventDefault();
    event.stopPropagation();
    dom.sendDataDropzone?.classList.add('is-dragover');
  }

  function handleSendDataDropzoneDragOver(event) {
    event.preventDefault();
    event.stopPropagation();
    dom.sendDataDropzone?.classList.add('is-dragover');
  }

  function handleSendDataDropzoneDragLeave(event) {
    event.preventDefault();
    event.stopPropagation();
    if (dom.sendDataDropzone && event.relatedTarget && dom.sendDataDropzone.contains(event.relatedTarget)) {
      return;
    }
    dom.sendDataDropzone?.classList.remove('is-dragover');
  }

  function handleSendDataDropzoneDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    dom.sendDataDropzone?.classList.remove('is-dragover');
    addSendDataFiles(event.dataTransfer?.files || []);
  }

  function handleSendDataFileQueueClick(event) {
    const activateButton = event.target.closest('[data-action="activate-send-data-file"]');
    if (activateButton) {
      setActiveSendDataFile(activateButton.dataset.id);
      return;
    }

    const retryButton = event.target.closest('[data-action="retry-send-data-file"]');
    if (retryButton) {
      previewSendDataFile('', retryButton.dataset.id);
      return;
    }

    const removeButton = event.target.closest('[data-action="remove-send-data-file"]');
    if (removeButton) {
      removeSendDataFile(removeButton.dataset.id);
    }
  }

  async function handleSendDataSaveDraft() {
    await submitCurrentSendData('draft');
  }

  async function handleSendDataSubmit() {
    await submitCurrentSendData('send');
  }

  async function submitCurrentSendData(mode) {
    if (!state.sendDataFiles.length) {
      setSendDataError(`Choose at least one CSV or Excel file first before you ${mode === 'draft' ? 'save drafts' : 'send data to the admin'}.`);
      return;
    }

    const queuedEntries = state.sendDataFiles.filter((entry) => entry.preview && Array.isArray(entry.selectedSheets) && entry.selectedSheets.length);
    if (!queuedEntries.length) {
      setSendDataError(`Choose at least one table or sheet from a queued file to ${mode === 'draft' ? 'save as draft' : 'send to the admin'}.`);
      return;
    }

    setSendDataLoading(true, mode === 'draft' ? 'draft' : 'send');
    setSendDataError('');
    setSendDataSuccess('');

    try {
      const createdSubmissions = [];
      const processedEntryIds = new Set();
      const totalUploads = queuedEntries.reduce((count, entry) => count + entry.selectedSheets.length, 0);
      let completedUploads = 0;
      for (const entry of queuedEntries) {
        for (const sheetName of entry.selectedSheets) {
          const sheetConfig = getSendDataSheetConfig(sheetName, entry.id);
          const formData = new FormData();
          formData.append('file', entry.file);
          formData.append('sheet_name', sheetName);
          formData.append('save_mode', mode);
          formData.append('notes', entry.notes || '');
          if (sheetConfig.mappingProfileKey) {
            formData.append('mapping_profile_key', sheetConfig.mappingProfileKey);
          }
          if (Object.keys(sheetConfig.columnMapping).length) {
            formData.append('column_mapping', JSON.stringify(sheetConfig.columnMapping));
          }
          const currentStep = completedUploads + 1;
          const stepLabel = totalUploads > 1
            ? `${mode === 'draft' ? 'Saving draft' : 'Uploading submission'} ${currentStep} of ${totalUploads}: ${entry.file.name} (${sheetName})`
            : `${mode === 'draft' ? 'Saving draft upload' : 'Uploading submission'}: ${entry.file.name} (${sheetName})`;
          setSendDataEntryProgress(entry, 0, stepLabel);
          const createdSubmission = await apiUploadRequest('/data-submissions/', {
            method: 'POST',
            body: formData,
            onProgress: ({ progress }) => {
              const overallProgress = Number.isFinite(progress) && totalUploads
                ? (completedUploads + progress) / totalUploads
                : null;
              setSendDataProgress(overallProgress, stepLabel);
              setSendDataEntryProgress(entry, progress, stepLabel);
            },
          });
          createdSubmissions.push(createdSubmission);
          completedUploads += 1;
          setSendDataEntryProgress(entry, 1, `${mode === 'draft' ? 'Draft saved' : 'Submission uploaded'} for ${sheetName}`);
        }
        processedEntryIds.add(entry.id);
      }
      state.dataSubmissions = [...createdSubmissions.reverse(), ...state.dataSubmissions];
      state.sendDataFiles = state.sendDataFiles.filter((entry) => !processedEntryIds.has(entry.id));
      if (!state.sendDataFiles.some((entry) => entry.id === state.sendDataActiveFileId)) {
        state.sendDataActiveFileId = state.sendDataFiles[0]?.id || null;
      }
      syncSendDataStateFromActiveFile();
      setSendDataSuccess(
        mode === 'draft'
          ? `${createdSubmissions.length} sheet draft(s) saved successfully across ${processedEntryIds.size} file(s). You can send them later when you are ready.`
          : `${createdSubmissions.length} sheet(s) sent successfully across ${processedEntryIds.size} file(s). The admin can now review them from the dashboard.`
      );
      renderSendData();
    } catch (error) {
      setSendDataError(extractErrorMessage(error));
    } finally {
      setSendDataLoading(false, mode === 'draft' ? 'draft' : 'send');
    }
  }

  async function previewSendDataFile(sheetName = '', fileId = state.sendDataActiveFileId, options = {}) {
    const targetEntry = getSendDataFileEntry(fileId);
    if (!targetEntry) {
      return;
    }

    const progressIndex = Math.max(1, Number(options.progressIndex) || 1);
    const progressTotal = Math.max(1, Number(options.progressTotal) || 1);
    const skipLoadingToggle = !!options.skipLoadingToggle;
    const isActiveEntry = fileId === state.sendDataActiveFileId;
    targetEntry.status = 'loading';
    targetEntry.error = '';
    setSendDataEntryProgress(targetEntry, 0, `Uploading ${targetEntry.file.name} for preview`);
    if (isActiveEntry) {
      syncSendDataStateFromActiveFile();
    }
    if (!skipLoadingToggle) {
      setSendDataLoading(true, 'preview');
    }
    if (isActiveEntry) {
      setSendDataError('');
      setSendDataSuccess('');
    }

    const formData = new FormData();
    formData.append('file', targetEntry.file);
    const requestedSheetName = sheetName || targetEntry.preview?.selected_sheet_name || targetEntry.preview?.sheet_name || '';
    if (requestedSheetName) {
      formData.append('sheet_name', requestedSheetName);
    }
    const sheetConfig = getSendDataSheetConfig(requestedSheetName, targetEntry.id);
    if (sheetConfig.mappingProfileKey) {
      formData.append('mapping_profile_key', sheetConfig.mappingProfileKey);
    }
    if (Object.keys(sheetConfig.columnMapping).length) {
      formData.append('column_mapping', JSON.stringify(sheetConfig.columnMapping));
    }

    try {
      const payload = await apiUploadRequest('/data-submissions/preview/', {
        method: 'POST',
        body: formData,
        onProgress: ({ progress }) => {
          const overallProgress = Number.isFinite(progress)
            ? ((progressIndex - 1) + progress) / progressTotal
            : null;
          const progressLabel = progressTotal > 1
            ? `Uploading ${targetEntry.file.name} for preview (${progressIndex} of ${progressTotal})`
            : `Uploading ${targetEntry.file.name} for preview`;
          setSendDataProgress(overallProgress, progressLabel);
          setSendDataEntryProgress(targetEntry, progress, progressLabel);
        },
      });
      const previousSelections = Array.isArray(targetEntry.selectedSheets) ? targetEntry.selectedSheets.slice() : [];
      const defaultSelection = payload.selected_sheet_name ? [payload.selected_sheet_name] : [];
      const availableSheetNames = Array.isArray(payload.sheets) ? payload.sheets.map((item) => item.name) : [];
      const preservedSelections = previousSelections.filter((name) => availableSheetNames.includes(name));

      targetEntry.selectedSheets = preservedSelections.length ? preservedSelections : defaultSelection;
      const resolvedSheetName = payload.selected_sheet_name || payload.sheet_name || requestedSheetName;
      if (resolvedSheetName) {
        targetEntry.sheetConfigs[resolvedSheetName] = {
          mappingProfileKey: payload.mapping_profile_key || '',
          columnMapping: normalizeColumnMapping(payload.column_mapping),
        };
      }
      targetEntry.preview = {
        ...payload,
        search: '',
        sortIndex: null,
        sortDirection: 'asc',
        currentPage: 1,
        pageSize: 15,
      };
      targetEntry.status = 'ready';
      targetEntry.error = '';
      setSendDataEntryProgress(targetEntry, 1, `Preview ready for ${targetEntry.file.name}`);
      if (isActiveEntry) {
        syncSendDataStateFromActiveFile();
        if (dom.sendDataPreviewSearch) {
          dom.sendDataPreviewSearch.value = '';
        }
      }
    } catch (error) {
      targetEntry.preview = null;
      targetEntry.selectedSheets = [];
      targetEntry.sheetConfigs = {};
      targetEntry.status = 'error';
      targetEntry.error = extractErrorMessage(error);
      setSendDataEntryProgress(targetEntry, null, '');
      if (isActiveEntry) {
        syncSendDataStateFromActiveFile();
        setSendDataError(targetEntry.error);
      }
    } finally {
      if (!skipLoadingToggle) {
        setSendDataLoading(false, 'preview');
      }
      renderSendData();
    }
  }

  function setSendDataLoading(isLoading, mode = 'send') {
    toggleElement(dom.sendDataLoading, isLoading);
    dom.sendDataLoading?.setAttribute('aria-busy', String(isLoading));
    if (dom.sendDataLoadingTitle) {
      dom.sendDataLoadingTitle.textContent = mode === 'preview'
        ? 'Preparing file preview...'
        : mode === 'draft'
          ? 'Saving data draft...'
          : 'Sending data file...';
    }
    if (dom.sendDataLoadingText) {
      dom.sendDataLoadingText.textContent = mode === 'preview'
        ? 'Please wait while the CSV or Excel file is read and validation feedback is prepared.'
        : mode === 'draft'
          ? 'Please wait while the selected table data and notes are saved as a draft for later.'
          : 'Please wait while the selected table data is validated and delivered to the admin dashboard.';
    }
    if (isLoading) {
      const initialProgressLabel = mode === 'preview'
        ? 'Starting file upload...'
        : mode === 'draft'
          ? 'Preparing draft upload...'
          : 'Preparing submission upload...';
      setSendDataProgress(0, initialProgressLabel);
    } else {
      setSendDataProgress(0, 'Starting upload...');
    }
    if (dom.sendDataSaveDraftBtn) {
      dom.sendDataSaveDraftBtn.disabled = isLoading;
    }
    if (dom.sendDataSubmitBtn) {
      dom.sendDataSubmitBtn.disabled = isLoading;
    }
    if (dom.sendDataSelectBtn) {
      dom.sendDataSelectBtn.disabled = isLoading;
    }
    if (dom.sendDataNotes) {
      dom.sendDataNotes.disabled = isLoading;
    }
    if (dom.sendDataTemplateSelect) {
      dom.sendDataTemplateSelect.disabled = isLoading;
    }
  }

  function setSendDataProgress(progress, label = 'Starting upload...') {
    const hasNumericProgress = Number.isFinite(progress);
    const progressPercent = hasNumericProgress
      ? Math.max(0, Math.min(100, Math.round(progress * 100)))
      : null;

    if (dom.sendDataLoadingProgressBar) {
      dom.sendDataLoadingProgressBar.style.width = progressPercent == null ? '36%' : `${progressPercent}%`;
      dom.sendDataLoadingProgressBar.classList.toggle('is-indeterminate', progressPercent == null);
    }
    if (dom.sendDataLoadingProgressLabel) {
      dom.sendDataLoadingProgressLabel.textContent = label;
    }
    if (dom.sendDataLoadingProgressValue) {
      dom.sendDataLoadingProgressValue.textContent = progressPercent == null ? 'Working...' : `${progressPercent}%`;
    }
  }

  function getSendDataNotes() {
    return dom.sendDataNotes ? dom.sendDataNotes.value.trim() : '';
  }

  function getActiveSendDataSheetName() {
    return state.sendDataPreview?.selected_sheet_name || state.sendDataPreview?.sheet_name || '';
  }

  function normalizeColumnMapping(columnMapping) {
    if (!columnMapping || typeof columnMapping !== 'object') {
      return {};
    }

    return Object.entries(columnMapping).reduce((result, [fieldName, headerName]) => {
      const normalizedField = String(fieldName || '').trim();
      const normalizedHeader = String(headerName || '').trim();
      if (normalizedField && normalizedHeader) {
        result[normalizedField] = normalizedHeader;
      }
      return result;
    }, {});
  }

  function getSendDataSheetConfig(sheetName, fileId = state.sendDataActiveFileId) {
    const normalizedSheetName = String(sheetName || '').trim();
    if (!normalizedSheetName) {
      return { mappingProfileKey: '', columnMapping: {} };
    }

    const targetEntry = getSendDataFileEntry(fileId);
    const existingConfig = targetEntry?.sheetConfigs?.[normalizedSheetName];
    return {
      mappingProfileKey: String(existingConfig?.mappingProfileKey || '').trim(),
      columnMapping: normalizeColumnMapping(existingConfig?.columnMapping),
    };
  }

  function saveSendDataSheetConfig(sheetName, config, fileId = state.sendDataActiveFileId) {
    const normalizedSheetName = String(sheetName || '').trim();
    if (!normalizedSheetName) {
      return;
    }

    const targetEntry = getSendDataFileEntry(fileId);
    if (!targetEntry) {
      return;
    }

    targetEntry.sheetConfigs = targetEntry.sheetConfigs || {};
    targetEntry.sheetConfigs[normalizedSheetName] = {
      mappingProfileKey: String(config?.mappingProfileKey || '').trim(),
      columnMapping: normalizeColumnMapping(config?.columnMapping),
    };
    if (fileId === state.sendDataActiveFileId) {
      state.sendDataSheetConfigs = targetEntry.sheetConfigs;
    }
  }

  function setSendDataError(message) {
    if (!dom.sendDataError) {
      return;
    }
    dom.sendDataError.textContent = message || '';
    toggleElement(dom.sendDataError, !!message);
  }

  function setSendDataSuccess(message) {
    if (!dom.sendDataSuccess) {
      return;
    }
    dom.sendDataSuccess.textContent = message || '';
    toggleElement(dom.sendDataSuccess, !!message);
  }

  function handleSendDataListClick(event) {
    const sendDraftButton = event.target.closest('[data-action="send-draft-submission"]');
    if (!sendDraftButton) {
      return;
    }

    const submissionId = Number(sendDraftButton.dataset.id);
    if (!Number.isInteger(submissionId)) {
      return;
    }

    sendDraftSubmission(submissionId);
  }

  function handleSendDataTemplateChange(event) {
    if (!state.sendDataPreview) {
      return;
    }

    const activeSheetName = getActiveSendDataSheetName();
    if (!activeSheetName) {
      return;
    }

    saveSendDataSheetConfig(activeSheetName, {
      mappingProfileKey: String(event.target.value || '').trim(),
      columnMapping: {},
    });
    persistActiveSendDataState();
    previewSendDataFile(activeSheetName);
  }

  function handleSendDataMappingChange(event) {
    const select = event.target.closest('[data-mapping-field]');
    if (!select || !state.sendDataPreview) {
      return;
    }

    const activeSheetName = getActiveSendDataSheetName();
    if (!activeSheetName) {
      return;
    }

    const fieldName = String(select.dataset.mappingField || '').trim();
    if (!fieldName) {
      return;
    }

    const existingConfig = getSendDataSheetConfig(activeSheetName);
    const fallbackProfileKey = existingConfig.mappingProfileKey || (state.sendDataPreview.validation?.profile_key !== 'generic'
      ? state.sendDataPreview.validation?.profile_key
      : '');
    const nextMapping = {
      ...existingConfig.columnMapping,
      [fieldName]: String(select.value || '').trim(),
    };
    if (!nextMapping[fieldName]) {
      delete nextMapping[fieldName];
    }

    saveSendDataSheetConfig(activeSheetName, {
      mappingProfileKey: fallbackProfileKey,
      columnMapping: nextMapping,
    });
    persistActiveSendDataState();
    previewSendDataFile(activeSheetName);
  }

  function handleSendDataNotesInput() {
    const activeEntry = getActiveSendDataFileEntry();
    if (!activeEntry) {
      return;
    }
    activeEntry.notes = getSendDataNotes();
  }

  function clearSendDataHistoryFilters() {
    if (dom.sendDataHistorySearch) {
      dom.sendDataHistorySearch.value = '';
    }
    if (dom.sendDataHistoryStatusFilter) {
      dom.sendDataHistoryStatusFilter.value = '';
    }
    if (dom.sendDataHistoryDateFrom) {
      dom.sendDataHistoryDateFrom.value = '';
    }
    if (dom.sendDataHistoryDateTo) {
      dom.sendDataHistoryDateTo.value = '';
    }
    renderSendData();
  }

  async function sendDraftSubmission(submissionId) {
    const draftSubmission = state.dataSubmissions.find((item) => Number(item.id) === submissionId);
    if (!draftSubmission) {
      setSendDataError('Draft submission not found.');
      return;
    }

    if (draftSubmission.status !== 'Draft') {
      setSendDataError('Only draft submissions can be sent later.');
      return;
    }

    setSendDataLoading(true, 'send');
    setSendDataError('');
    setSendDataSuccess('');

    try {
      const updatedSubmission = await apiRequest(`/data-submissions/${submissionId}/send/`, {
        method: 'POST',
        body: JSON.stringify({ notes: draftSubmission.submission_notes || '' }),
      });
      state.dataSubmissions = state.dataSubmissions.map((item) => (
        Number(item.id) === submissionId ? updatedSubmission : item
      ));
      renderSendData();
      showToast('Draft sent', `${updatedSubmission.original_filename} ${updatedSubmission.version_label || ''} was sent to the admin.`);
    } catch (error) {
      setSendDataError(extractErrorMessage(error));
    } finally {
      setSendDataLoading(false, 'send');
    }
  }

  function handleSendDataSheetListClick(event) {
    const previewButton = event.target.closest('[data-action="preview-send-sheet"]');
    if (!previewButton) {
      return;
    }

    const sheetName = previewButton.dataset.sheetName || '';
    if (!sheetName || !state.sendDataFile) {
      return;
    }

    previewSendDataFile(sheetName);
  }

  function handleSendDataSheetListChange(event) {
    const checkbox = event.target.closest('[data-sheet-name]');
    if (!checkbox) {
      return;
    }

    const sheetName = checkbox.dataset.sheetName || '';
    if (!sheetName) {
      return;
    }

    if (checkbox.checked) {
      if (!state.sendDataSelectedSheets.includes(sheetName)) {
        state.sendDataSelectedSheets.push(sheetName);
      }
    } else {
      state.sendDataSelectedSheets = state.sendDataSelectedSheets.filter((value) => value !== sheetName);
    }

    persistActiveSendDataState();
    renderSendDataPreview();
    renderSendDataFileQueue();
  }

  function handleSendDataPreviewSearch(event) {
    if (!state.sendDataPreview) {
      return;
    }
    state.sendDataPreview.search = event.target.value.trim().toLowerCase();
    state.sendDataPreview.currentPage = 1;
    persistActiveSendDataState();
    renderSendDataPreview();
  }

  function handleSendDataPreviewTableClick(event) {
    const sortButton = event.target.closest('[data-send-data-sort-index]');
    if (!sortButton || !state.sendDataPreview) {
      return;
    }

    const sortIndex = Number(sortButton.dataset.sendDataSortIndex);
    if (!Number.isInteger(sortIndex)) {
      return;
    }

    if (state.sendDataPreview.sortIndex === sortIndex) {
      state.sendDataPreview.sortDirection = state.sendDataPreview.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      state.sendDataPreview.sortIndex = sortIndex;
      state.sendDataPreview.sortDirection = 'asc';
    }

    state.sendDataPreview.currentPage = 1;
    persistActiveSendDataState();
    renderSendDataPreview();
  }

  function changeSendDataPreviewPage(direction) {
    if (!state.sendDataPreview) {
      return;
    }

    const totalPages = Math.max(1, Math.ceil(getSendDataPreviewRows().length / state.sendDataPreview.pageSize));
    const nextPage = Math.min(totalPages, Math.max(1, state.sendDataPreview.currentPage + direction));
    if (nextPage === state.sendDataPreview.currentPage) {
      return;
    }

    state.sendDataPreview.currentPage = nextPage;
    persistActiveSendDataState();
    renderSendDataPreview();
  }

  function renderSendDataPreview() {
    if (!dom.sendDataPreviewPanel) {
      return;
    }

    const preview = state.sendDataPreview;
    toggleElement(dom.sendDataPreviewContent, !!preview);
    toggleElement(dom.sendDataPreviewEmpty, !preview);

    if (!preview) {
      const activeEntry = getActiveSendDataFileEntry();
      if (dom.sendDataPreviewMeta) {
        dom.sendDataPreviewMeta.textContent = activeEntry
          ? `Open or retry ${activeEntry.file.name} to load its table preview and validate it before sending.`
          : 'Select or drop CSV or Excel files to build a queue, then open one to load its preview.';
      }
      if (dom.sendDataPreviewEmpty) {
        dom.sendDataPreviewEmpty.innerHTML = activeEntry?.error
          ? buildSendDataEmptyState(
            'We could not preview this file',
            activeEntry.error
          )
          : buildSendDataEmptyState(
            'Upload your first CSV or Excel file to get started',
            activeEntry
              ? `Open ${activeEntry.file.name} to load its preview, choose the table data you want, and review the validation notes.`
              : 'Drag one or more CSV or Excel files into the upload box, then open a queued file to inspect it before sending.'
          );
      }
      if (dom.sendDataSheetCount) {
        dom.sendDataSheetCount.innerHTML = '<i class="fa-solid fa-layer-group"></i>0 selected';
      }
      if (dom.sendDataVersionMeta) {
        dom.sendDataVersionMeta.innerHTML = '<i class="fa-solid fa-code-branch"></i>Next version: v1';
      }
      if (dom.sendDataTemplateSelect) {
        dom.sendDataTemplateSelect.innerHTML = '<option value="">Auto detect template</option>';
        dom.sendDataTemplateSelect.value = '';
      }
      if (dom.sendDataMappingHelp) {
        dom.sendDataMappingHelp.textContent = 'If the file uses different column names, map them to the required fields here.';
      }
      if (dom.sendDataMappingFields) {
        dom.sendDataMappingFields.innerHTML = buildSendDataEmptyState(
          'Mapping will appear after preview',
          'Choose a CSV table or workbook sheet first if you need to map custom headers to the required fields.'
        );
      }
      if (dom.sendDataValidationProfile) {
        dom.sendDataValidationProfile.textContent = 'Basic file checks will appear here once a table is previewed.';
      }
      if (dom.sendDataValidationIssueCount) {
        dom.sendDataValidationIssueCount.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i>0 issues';
      }
      if (dom.sendDataValidationList) {
        dom.sendDataValidationList.innerHTML = buildSendDataEmptyState(
          'Validation feedback will appear here',
          'Preview a CSV table or workbook sheet first and we will surface missing columns, invalid formats, and duplicate entries.'
        );
      }
      if (dom.sendDataPreviewRowsCount) {
        dom.sendDataPreviewRowsCount.innerHTML = '<i class="fa-solid fa-table-list"></i>0 rows';
      }
      if (dom.sendDataPreviewColumnsCount) {
        dom.sendDataPreviewColumnsCount.innerHTML = '<i class="fa-solid fa-table-columns"></i>0 columns';
      }
      if (dom.sendDataPreviewHint) {
        dom.sendDataPreviewHint.textContent = 'Preview the selected table here before sending it to the admin.';
      }
      if (dom.sendDataPreviewPageInfo) {
        dom.sendDataPreviewPageInfo.innerHTML = '<i class="fa-solid fa-book-open"></i>Page 1 of 1';
      }
      if (dom.sendDataPreviewTableWrap) {
        dom.sendDataPreviewTableWrap.innerHTML = activeEntry?.error
          ? buildSendDataEmptyState('Preview unavailable right now', activeEntry.error)
          : buildSendDataEmptyState(
            'Upload your first CSV or Excel file to get started',
            'Once a file is previewed, the table rows will appear here so you can review them before sending.'
          );
      }
      if (dom.sendDataSheetList) {
        dom.sendDataSheetList.innerHTML = buildSendDataEmptyState(
          'Table options will appear here',
          'After the file is analyzed, you can choose exactly which CSV table or Excel sheet to send.'
        );
      }
      if (dom.sendDataPrevPageBtn) {
        dom.sendDataPrevPageBtn.disabled = true;
      }
      if (dom.sendDataNextPageBtn) {
        dom.sendDataNextPageBtn.disabled = true;
      }
      return;
    }

    if (dom.sendDataPreviewMeta) {
      dom.sendDataPreviewMeta.textContent = `${preview.file_name} | Previewing: ${preview.selected_sheet_name || preview.sheet_name} | ${preview.total_rows} row(s) detected.`;
    }
    if (dom.sendDataSheetCount) {
      dom.sendDataSheetCount.innerHTML = `<i class="fa-solid fa-layer-group"></i>${state.sendDataSelectedSheets.length} selected`;
    }
    if (dom.sendDataVersionMeta) {
      dom.sendDataVersionMeta.innerHTML = `<i class="fa-solid fa-code-branch"></i>Next version: ${escapeHtml(preview.next_version_label || `v${preview.next_version_number || 1}`)}`;
    }

    renderSendDataSheetList();
    renderSendDataMapping(preview.validation || {});
    renderSendDataValidation(preview.validation || {});

    const filteredRows = getSendDataPreviewRows();
    const totalPages = Math.max(1, Math.ceil(filteredRows.length / preview.pageSize));
    preview.currentPage = Math.min(totalPages, Math.max(1, preview.currentPage));
    const startIndex = (preview.currentPage - 1) * preview.pageSize;
    const pageRows = filteredRows.slice(startIndex, startIndex + preview.pageSize);

    if (dom.sendDataPreviewRowsCount) {
      dom.sendDataPreviewRowsCount.innerHTML = `<i class="fa-solid fa-table-list"></i>${preview.total_rows} row(s)`;
    }
    if (dom.sendDataPreviewColumnsCount) {
      dom.sendDataPreviewColumnsCount.innerHTML = `<i class="fa-solid fa-table-columns"></i>${preview.total_columns} column(s)`;
    }
    if (dom.sendDataPreviewHint) {
      dom.sendDataPreviewHint.textContent = preview.preview_truncated
        ? `Showing the first ${preview.max_preview_rows} row(s) for the selected table preview.`
        : `Previewing ${preview.selected_sheet_name || preview.sheet_name} before submission.`;
    }
    if (dom.sendDataPreviewPageInfo) {
      dom.sendDataPreviewPageInfo.innerHTML = `<i class="fa-solid fa-book-open"></i>Page ${preview.currentPage} of ${totalPages}`;
    }
    if (dom.sendDataPrevPageBtn) {
      dom.sendDataPrevPageBtn.disabled = preview.currentPage <= 1;
    }
    if (dom.sendDataNextPageBtn) {
      dom.sendDataNextPageBtn.disabled = preview.currentPage >= totalPages;
    }

    if (!pageRows.length) {
      dom.sendDataPreviewTableWrap.innerHTML = '<div class="excel-empty-state">No rows match your current search.</div>';
      return;
    }

    const headerMarkup = preview.headers.map((header, index) => `
      <th>
        <button class="excel-sort-btn" type="button" data-send-data-sort-index="${index}">
          <span>${escapeHtml(header)}</span>
          <i class="${getSendDataSortIcon(index)}"></i>
        </button>
      </th>
    `).join('');

    const bodyMarkup = pageRows.map((row, pageIndex) => `
      <tr>
        <td class="row-index">Row ${startIndex + pageIndex + 1}</td>
        ${row.map((cell) => `<td>${escapeHtml(cell || '')}</td>`).join('')}
      </tr>
    `).join('');

    dom.sendDataPreviewTableWrap.innerHTML = `
      <table class="excel-preview-table">
        <thead>
          <tr>
            <th class="row-index">Row</th>
            ${headerMarkup}
          </tr>
        </thead>
        <tbody>
          ${bodyMarkup}
        </tbody>
      </table>
    `;
  }

  function renderSendDataMapping(validation) {
    if (!dom.sendDataTemplateSelect || !dom.sendDataMappingHelp || !dom.sendDataMappingFields) {
      return;
    }

    const templates = Array.isArray(validation.available_templates) ? validation.available_templates : [];
    const selectedProfileKey = validation.profile_key && validation.profile_key !== 'generic' ? validation.profile_key : '';
    dom.sendDataTemplateSelect.innerHTML = [
      '<option value="">Auto detect template</option>',
      ...templates.map((template) => `<option value="${escapeAttribute(template.key)}">${escapeHtml(template.label)}</option>`),
    ].join('');
    dom.sendDataTemplateSelect.value = selectedProfileKey;

    if (!selectedProfileKey) {
      dom.sendDataMappingHelp.textContent = 'Select a template if this file uses different column names and you want to map them manually.';
      dom.sendDataMappingFields.innerHTML = buildEmptyState('Template mapping is optional. Use auto-detect or choose a template to map custom headers.');
      return;
    }

    const requiredColumns = Array.isArray(validation.required_columns) ? validation.required_columns : [];
    const missingColumns = Array.isArray(validation.missing_required_columns) ? validation.missing_required_columns : [];
    const mappingOptions = Array.isArray(validation.mapping_options) ? validation.mapping_options : [];
    const appliedMapping = normalizeColumnMapping(validation.applied_column_mapping);
    const mappedCount = requiredColumns.filter((fieldName) => !!appliedMapping[fieldName]).length;
    dom.sendDataMappingHelp.textContent = `${mappedCount} of ${requiredColumns.length} required field(s) are currently mapped for ${validation.profile_label || 'the selected template'}.`;

    if (!requiredColumns.length) {
      dom.sendDataMappingFields.innerHTML = buildEmptyState('No required fields are defined for the selected template.');
      return;
    }

    dom.sendDataMappingFields.innerHTML = requiredColumns.map((fieldName) => `
      <div class="list-item send-data-mapping-item">
        <div>
          <strong>${escapeHtml(fieldName)}</strong>
          <p>${missingColumns.includes(fieldName) ? 'This required field still needs a mapped column.' : `Mapped to ${appliedMapping[fieldName] || 'an automatically detected column'}.`}</p>
        </div>
        <div class="filter-box send-data-mapping-select">
          <i class="fa-solid fa-table-columns"></i>
          <select data-mapping-field="${escapeAttribute(fieldName)}">
            <option value="">Not mapped</option>
            ${mappingOptions.map((headerName) => `
              <option value="${escapeAttribute(headerName)}" ${appliedMapping[fieldName] === headerName ? 'selected' : ''}>
                ${escapeHtml(headerName)}
              </option>
            `).join('')}
          </select>
        </div>
      </div>
    `).join('');
  }

  function renderSendDataSheetList() {
    if (!dom.sendDataSheetList || !state.sendDataPreview) {
      return;
    }

    const sheets = Array.isArray(state.sendDataPreview.sheets) ? state.sendDataPreview.sheets : [];
    if (!sheets.length) {
      dom.sendDataSheetList.innerHTML = buildEmptyState('No previewable tables were detected in this file.');
      return;
    }

    dom.sendDataSheetList.innerHTML = sheets.map((sheet) => {
      const isChecked = state.sendDataSelectedSheets.includes(sheet.name);
      const isActive = (state.sendDataPreview.selected_sheet_name || state.sendDataPreview.sheet_name) === sheet.name;
      const statsText = sheet.has_data
        ? `${sheet.total_rows} row(s) | ${sheet.total_columns} column(s)`
        : 'No previewable rows found in this table';
      return `
        <div class="send-data-sheet-card ${isActive ? 'is-active' : ''}">
          <div class="send-data-sheet-main">
            <input type="checkbox" data-sheet-name="${escapeAttribute(sheet.name)}" ${isChecked ? 'checked' : ''} ${sheet.has_data ? '' : 'disabled'}>
            <div>
              <strong>${escapeHtml(sheet.name)}</strong>
              <p>${escapeHtml(statsText)}</p>
              ${sheet.next_version_label ? `<p>${escapeHtml(`Next save will create ${sheet.next_version_label}`)}</p>` : ''}
            </div>
          </div>
          <div class="send-data-sheet-actions">
            ${isActive ? '<span class="send-data-sheet-flag"><i class="fa-solid fa-eye"></i>Previewing</span>' : ''}
            ${sheet.has_data
              ? `<button class="btn btn-ghost" type="button" data-action="preview-send-sheet" data-sheet-name="${escapeAttribute(sheet.name)}"><i class="fa-solid fa-table"></i>Preview</button>`
              : '<span class="send-data-sheet-empty">Empty table</span>'}
          </div>
        </div>
      `;
    }).join('');
  }

  function renderSendDataValidation(validation) {
    if (!dom.sendDataValidationProfile || !dom.sendDataValidationIssueCount || !dom.sendDataValidationList) {
      return;
    }

    const issueCount = Number(validation.issue_count) || 0;
    dom.sendDataValidationProfile.textContent = validation.template_message || 'Basic file checks will appear here once a table is previewed.';
    dom.sendDataValidationIssueCount.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i>${issueCount} issue(s)`;

    const missingColumns = Array.isArray(validation.missing_required_columns) ? validation.missing_required_columns : [];
    const missingValueMessages = Array.isArray(validation.missing_value_messages) ? validation.missing_value_messages : [];
    const invalidFormatMessages = Array.isArray(validation.invalid_format_messages) ? validation.invalid_format_messages : [];
    const duplicateCount = Number(validation.duplicate_count) || 0;
    const validationCards = [
      buildValidationItem(
        'Missing required columns',
        missingColumns.length
          ? `Missing: ${missingColumns.join(', ')}`
          : 'No required columns are missing for the detected upload template.',
        missingColumns.length ? 'warning' : 'success',
        missingColumns.length ? 'fa-solid fa-table-columns' : 'fa-solid fa-circle-check'
      ),
      buildValidationItem(
        'Missing values',
        missingValueMessages.length
          ? missingValueMessages.join(' ')
          : 'No missing required values were detected in the current table preview.',
        missingValueMessages.length ? 'error' : 'success',
        missingValueMessages.length ? 'fa-solid fa-circle-exclamation' : 'fa-solid fa-circle-check'
      ),
      buildValidationItem(
        'Invalid formats',
        invalidFormatMessages.length
          ? invalidFormatMessages.join(' ')
          : 'No invalid date, category, or email formats were detected in this preview.',
        invalidFormatMessages.length ? 'error' : 'success',
        invalidFormatMessages.length ? 'fa-solid fa-triangle-exclamation' : 'fa-solid fa-circle-check'
      ),
      buildValidationItem(
        'Duplicate entries',
        validation.duplicate_message || 'No duplicate entries were detected in the current table preview.',
        duplicateCount ? 'warning' : 'success',
        duplicateCount ? 'fa-solid fa-copy' : 'fa-solid fa-circle-check'
      ),
    ];

    dom.sendDataValidationList.innerHTML = validationCards.join('');
  }

  function buildValidationItem(title, message, tone, icon) {
    return `
      <div class="list-item validation-item validation-${tone}">
        <div>
          <strong>${escapeHtml(title)}</strong>
          <p>${escapeHtml(message)}</p>
        </div>
        <span class="mini-pill"><i class="${escapeHtml(icon)}"></i>${capitalize(tone)}</span>
      </div>
    `;
  }

  function getSendDataPreviewRows() {
    if (!state.sendDataPreview) {
      return [];
    }

    let rows = state.sendDataPreview.rows.map((row) => Array.isArray(row) ? row.slice() : []);
    if (state.sendDataPreview.search) {
      rows = rows.filter((row) => row.join(' ').toLowerCase().includes(state.sendDataPreview.search));
    }
    if (Number.isInteger(state.sendDataPreview.sortIndex)) {
      const columnIndex = state.sendDataPreview.sortIndex;
      const direction = state.sendDataPreview.sortDirection === 'desc' ? -1 : 1;
      rows.sort((leftRow, rightRow) => compareExcelPreviewValues(leftRow[columnIndex], rightRow[columnIndex]) * direction);
    }
    return rows;
  }

  function getSendDataSortIcon(index) {
    if (!state.sendDataPreview || state.sendDataPreview.sortIndex !== index) {
      return 'fa-solid fa-sort';
    }
    return state.sendDataPreview.sortDirection === 'desc' ? 'fa-solid fa-sort-down' : 'fa-solid fa-sort-up';
  }

  function handleIncomingDataClick(event) {
    const quickStatusButton = event.target.closest('[data-action="quick-submission-status"]');
    if (quickStatusButton) {
      const submissionId = Number(quickStatusButton.dataset.id);
      const nextStatus = String(quickStatusButton.dataset.status || '').trim();
      if (Number.isInteger(submissionId) && nextStatus) {
        applySubmissionQuickStatus(submissionId, nextStatus);
      }
      return;
    }

    const saveButton = event.target.closest('[data-action="save-submission-status"]');
    if (saveButton) {
      const submissionId = Number(saveButton.dataset.id);
      if (Number.isInteger(submissionId)) {
        saveSubmissionStatusUpdate(submissionId);
      }
      return;
    }

    const previewButton = event.target.closest('[data-action="load-submission-preview"]');
    if (!previewButton) {
      return;
    }

    const submissionId = Number(previewButton.dataset.id);
    if (!Number.isInteger(submissionId)) {
      return;
    }
    openSubmissionPreview(submissionId);
  }

  function handleIncomingDataChange(event) {
    const selectionToggle = event.target.closest('[data-action="toggle-submission-selection"]');
    if (!selectionToggle) {
      return;
    }

    const submissionId = Number(selectionToggle.dataset.id);
    if (!Number.isInteger(submissionId)) {
      return;
    }

    if (selectionToggle.checked) {
      if (!state.incomingDataSelectedIds.includes(submissionId)) {
        state.incomingDataSelectedIds = [...state.incomingDataSelectedIds, submissionId];
      }
    } else {
      state.incomingDataSelectedIds = state.incomingDataSelectedIds.filter((value) => value !== submissionId);
    }
    renderIncomingData();
  }

  function handleIncomingDataSelectAllChange(event) {
    const filteredIds = getFilteredIncomingDataSubmissions()
      .map((submission) => Number(submission.id))
      .filter((submissionId) => Number.isInteger(submissionId));
    if (event.target.checked) {
      state.incomingDataSelectedIds = Array.from(new Set([...state.incomingDataSelectedIds, ...filteredIds]));
    } else {
      state.incomingDataSelectedIds = state.incomingDataSelectedIds.filter((submissionId) => !filteredIds.includes(submissionId));
    }
    renderIncomingData();
  }

  function getSelectedIncomingSubmissions() {
    return state.dataSubmissions.filter((submission) => state.incomingDataSelectedIds.includes(Number(submission.id)));
  }

  function setIncomingDataBatchStatus(message, isProcessing = false) {
    state.incomingDataBatchProcessing = isProcessing;
    if (!dom.incomingDataBulkStatus) {
      return;
    }

    dom.incomingDataBulkStatus.innerHTML = isProcessing
      ? `<i class="fa-solid fa-spinner fa-spin"></i>${escapeHtml(message)}`
      : `<i class="fa-solid fa-bolt"></i>${escapeHtml(message)}`;
  }

  async function performIncomingDataBulkStatusUpdate(nextStatus) {
    if (!canApproveSubmissions()) {
      showToast('Access denied', 'Only Super Admins and Reviewers can approve incoming Excel submissions.', 'fa-solid fa-lock');
      return;
    }

    const selectedSubmissions = getSelectedIncomingSubmissions();
    if (!selectedSubmissions.length) {
      showToast('Select files first', 'Choose one or more incoming files before running a bulk action.', 'fa-solid fa-layer-group');
      return;
    }

    const adminFeedback = dom.incomingDataBulkFeedback?.value.trim() || '';
    if (nextStatus === 'Rejected' && !adminFeedback) {
      dom.incomingDataBulkFeedback?.focus();
      showToast('Feedback required', 'Add a batch reason before rejecting multiple files.', 'fa-solid fa-triangle-exclamation');
      return;
    }

    const selectedIds = selectedSubmissions.map((submission) => Number(submission.id));
    setIncomingDataBatchStatus(`Processing ${selectedSubmissions.length} file${selectedSubmissions.length === 1 ? '' : 's'}...`, true);
    renderIncomingData();

    try {
      const payload = await apiRequest('/data-submissions/bulk-status/', {
        method: 'POST',
        body: JSON.stringify({
          submission_ids: selectedIds,
          status: nextStatus,
          admin_feedback: adminFeedback,
        }),
      });
      const updatedSubmissions = Array.isArray(payload.updated_submissions) ? payload.updated_submissions : [];
      updatedSubmissions.forEach((submission) => {
        syncDataSubmissionRecord(submission);
        if (state.excelPreview && Number(state.excelPreview.sourceSubmissionId) === Number(submission.id)) {
          state.excelPreview.sourceSubmissionStatus = submission.status;
          state.excelPreview.sourceSubmissionFeedback = submission.admin_feedback || '';
        }
      });
      state.incomingDataSelectedIds = [];
      if (dom.incomingDataBulkFeedback) {
        dom.incomingDataBulkFeedback.value = '';
      }
      renderIncomingData();
      renderExcelPreview();
      await refreshNotificationsOnly();
      setIncomingDataBatchStatus(`${payload.updated_count || updatedSubmissions.length} file(s) updated.`, false);
      showToast('Batch update complete', `${payload.updated_count || updatedSubmissions.length} incoming file(s) moved to ${nextStatus}.`);
    } catch (error) {
      setIncomingDataBatchStatus('Batch action failed.', false);
      renderIncomingData();
      showToast('Batch update failed', extractErrorMessage(error), 'fa-solid fa-triangle-exclamation');
    }
  }

  async function exportSelectedIncomingData() {
    if (!canAccessAdminDashboard()) {
      showToast('Access denied', 'Only dashboard roles can export incoming Excel submissions.', 'fa-solid fa-lock');
      return;
    }

    const selectedSubmissions = getSelectedIncomingSubmissions();
    if (!selectedSubmissions.length) {
      showToast('Select files first', 'Choose one or more incoming files before exporting.', 'fa-solid fa-layer-group');
      return;
    }

    const selectedIds = selectedSubmissions.map((submission) => Number(submission.id));
    const query = new URLSearchParams({
      ids: selectedIds.join(','),
    });
    setIncomingDataBatchStatus(`Processing ${selectedSubmissions.length} file${selectedSubmissions.length === 1 ? '' : 's'}...`, true);
    renderIncomingData();

    try {
      const now = new Date();
      const downloadSucceeded = await downloadAuthenticatedFile(
        `/data-submissions/export/?${query.toString()}`,
        `incoming-data-export-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}.zip`
      );
      setIncomingDataBatchStatus(
        downloadSucceeded
          ? `${selectedSubmissions.length} file(s) exported.`
          : 'Batch export failed.',
        false
      );
    } finally {
      state.incomingDataBatchProcessing = false;
      renderIncomingData();
    }
  }

  function applySubmissionQuickStatus(submissionId, nextStatus) {
    if (!canApproveSubmissions()) {
      showToast('Access denied', 'Only Super Admins and Reviewers can approve incoming Excel submissions.', 'fa-solid fa-lock');
      return;
    }
    const statusSelect = dom.incomingDataList?.querySelector(`[data-submission-status-id="${submissionId}"]`);
    const feedbackInput = dom.incomingDataList?.querySelector(`[data-submission-feedback-id="${submissionId}"]`);
    if (statusSelect) {
      statusSelect.value = nextStatus;
    }

    if (['Needs Revision', 'Rejected'].includes(nextStatus) && !(feedbackInput?.value || '').trim()) {
      feedbackInput?.focus();
      showToast(
        'Feedback required',
        `Add a reason first, then ${nextStatus === 'Rejected' ? 'reject' : 'request revision for'} the file.`,
        'fa-solid fa-triangle-exclamation'
      );
      return;
    }

    saveSubmissionStatusUpdate(submissionId, { forcedStatus: nextStatus });
  }

  async function openSubmissionPreview(submissionId) {
    const submission = state.dataSubmissions.find((item) => Number(item.id) === submissionId);
    if (!submission) {
      return;
    }

    if (state.currentPage !== 'incoming-data' && canAccessAdminDashboard()) {
      switchPage('incoming-data');
    }

    setExcelPreviewLoading(true);
    setExcelPreviewError('');

    try {
      const payload = await apiRequest(`/data-submissions/${submissionId}/workspace/`);
      syncDataSubmissionRecord(payload.submission);
      applyExcelWorkspacePreview(payload.workspace_preview, { preserveView: false, keepDirty: false });
      renderIncomingData();
      renderExcelPreview();
      revealExcelPreviewPanel();
      showToast('Preview loaded', `${submission.original_filename} is now loaded in the Excel preview workspace.`);
    } catch (error) {
      setExcelPreviewError(extractErrorMessage(error));
    } finally {
      setExcelPreviewLoading(false);
    }
  }

  function syncDataSubmissionRecord(updatedSubmission) {
    if (!updatedSubmission || !Number.isInteger(Number(updatedSubmission.id))) {
      return;
    }

    const updatedId = Number(updatedSubmission.id);
    let foundMatch = false;
    state.dataSubmissions = state.dataSubmissions.map((item) => {
      if (Number(item.id) !== updatedId) {
        return item;
      }
      foundMatch = true;
      return updatedSubmission;
    });
    if (!foundMatch) {
      state.dataSubmissions = [updatedSubmission, ...state.dataSubmissions];
    }
  }

  function applyExcelWorkspacePreview(workspacePreview, options = {}) {
    if (!workspacePreview) {
      return;
    }

    const previousPreview = state.excelPreview;
    const nextPreview = buildExcelPreviewStateFromWorkspace(workspacePreview);
    if (options.preserveView && previousPreview) {
      nextPreview.search = previousPreview.search || '';
      nextPreview.currentPage = previousPreview.currentPage || 1;
      nextPreview.sortIndex = Number.isInteger(previousPreview.sortIndex) && previousPreview.sortIndex < nextPreview.headers.length
        ? previousPreview.sortIndex
        : null;
      nextPreview.sortDirection = previousPreview.sortDirection || 'asc';
    }
    nextPreview.isDirty = !!options.keepDirty;
    state.excelPreview = nextPreview;
    if (dom.excelPreviewSearch) {
      dom.excelPreviewSearch.value = nextPreview.search || '';
    }
  }

  function buildExcelPreviewStateFromWorkspace(workspacePreview) {
    return {
      file_name: workspacePreview.file_name,
      sheet_name: workspacePreview.sheet_name || 'Submitted worksheet',
      headers: Array.isArray(workspacePreview.headers) ? workspacePreview.headers : [],
      rows: Array.isArray(workspacePreview.rows) ? workspacePreview.rows.map((row) => Array.isArray(row) ? row.slice() : []) : [],
      total_rows: Number(workspacePreview.total_rows) || 0,
      total_columns: Number(workspacePreview.total_columns) || 0,
      preview_truncated: !!workspacePreview.preview_truncated,
      max_preview_rows: Number(workspacePreview.max_preview_rows) || 0,
      sourceSubmissionId: Number(workspacePreview.source_submission_id) || null,
      sourceSubmissionStatus: workspacePreview.source_submission_status || 'Pending',
      sourceSubmissionSender: workspacePreview.source_submission_sender || 'Unknown user',
      sourceSubmissionFeedback: workspacePreview.source_submission_feedback || '',
      sourceSubmissionCreatedAt: workspacePreview.source_submission_created_at || null,
      sourceSubmissionUpdatedAt: workspacePreview.source_submission_updated_at || null,
      validation: workspacePreview.validation || {},
      mappingProfileKey: workspacePreview.mapping_profile_key || '',
      columnMapping: normalizeColumnMapping(workspacePreview.column_mapping),
      reviewHistory: Array.isArray(workspacePreview.review_history) ? workspacePreview.review_history : [],
      versionComparison: workspacePreview.version_comparison || null,
      priority: workspacePreview.priority || {},
      search: '',
      sortIndex: null,
      sortDirection: 'asc',
      currentPage: 1,
      pageSize: 25,
      isDirty: false,
    };
  }

  function buildExcelPreviewStateFromSubmission(submission) {
    const previewRows = Array.isArray(submission.preview_rows) ? submission.preview_rows : [];
    return {
      file_name: submission.original_filename,
      sheet_name: submission.sheet_name || 'Submitted worksheet',
      headers: Array.isArray(submission.headers) ? submission.headers : [],
      rows: previewRows,
      total_rows: submission.total_rows || previewRows.length,
      total_columns: submission.total_columns || 0,
      preview_truncated: (submission.total_rows || 0) > previewRows.length,
      max_preview_rows: previewRows.length,
      sourceSubmissionId: submission.id,
      sourceSubmissionStatus: submission.status || 'Pending',
      sourceSubmissionSender: submission.submitted_by_name || submission.submitted_by_email || 'Unknown user',
      sourceSubmissionFeedback: submission.admin_feedback || '',
      sourceSubmissionCreatedAt: submission.created_at || null,
      sourceSubmissionUpdatedAt: submission.updated_at || null,
      validation: null,
      mappingProfileKey: submission.mapping_profile_key || '',
      columnMapping: normalizeColumnMapping(submission.column_mapping),
      reviewHistory: [],
      versionComparison: null,
      priority: {
        is_high_priority: !!submission.is_high_priority,
        priority_reason: submission.priority_reason || '',
      },
      search: '',
      sortIndex: null,
      sortDirection: 'asc',
      currentPage: 1,
      pageSize: 25,
      isDirty: false,
    };
  }

  function isExcelSubmissionWorkspace(preview = state.excelPreview) {
    return !!preview && Number.isInteger(Number(preview.sourceSubmissionId));
  }

  function serializeExcelSubmissionWorkspace(preview = state.excelPreview) {
    return {
      headers: Array.isArray(preview?.headers) ? preview.headers.slice() : [],
      preview_rows: Array.isArray(preview?.rows)
        ? preview.rows.map((row) => Array.isArray(row) ? row.slice() : [])
        : [],
      mapping_profile_key: preview?.mappingProfileKey || '',
      column_mapping: normalizeColumnMapping(preview?.columnMapping),
    };
  }

  function setExcelPreviewDirty(isDirty) {
    if (!state.excelPreview) {
      return;
    }
    state.excelPreview.isDirty = !!isDirty;
    updateExcelPreviewWorkspaceControls();
  }

  async function validateExcelSubmissionWorkspace(options = {}) {
    if (!isExcelSubmissionWorkspace()) {
      return;
    }
    if (!canEditData()) {
      showToast('Access denied', 'Only Super Admins and Reviewers can edit submission previews.', 'fa-solid fa-lock');
      return;
    }

    const preview = state.excelPreview;
    const silent = !!options.silent;
    setExcelPreviewLoading(true);
    if (!silent) {
      setExcelPreviewError('');
    }

    try {
      const payload = await apiRequest(`/data-submissions/${preview.sourceSubmissionId}/workspace/validate/`, {
        method: 'POST',
        body: JSON.stringify(serializeExcelSubmissionWorkspace(preview)),
      });
      applyExcelWorkspacePreview(payload.workspace_preview, { preserveView: true, keepDirty: true });
      renderExcelPreview();
      if (!silent) {
        showToast('Issues refreshed', 'The preview issues were rechecked with your current edits.');
      }
    } catch (error) {
      const message = extractErrorMessage(error);
      if (silent) {
        setExcelPreviewError(message);
      } else {
        showToast('Validation failed', message, 'fa-solid fa-triangle-exclamation');
      }
    } finally {
      setExcelPreviewLoading(false);
    }
  }

  async function saveExcelSubmissionWorkspace() {
    if (!isExcelSubmissionWorkspace()) {
      return;
    }
    if (!canEditData()) {
      showToast('Access denied', 'Only Super Admins and Reviewers can save submission preview changes.', 'fa-solid fa-lock');
      return;
    }

    const preview = state.excelPreview;
    setExcelPreviewLoading(true);
    setExcelPreviewError('');

    try {
      const payload = await apiRequest(`/data-submissions/${preview.sourceSubmissionId}/workspace/`, {
        method: 'PATCH',
        body: JSON.stringify(serializeExcelSubmissionWorkspace(preview)),
      });
      syncDataSubmissionRecord(payload.submission);
      applyExcelWorkspacePreview(payload.workspace_preview, { preserveView: true, keepDirty: false });
      renderIncomingData();
      renderExcelPreview();
      showToast('Preview fixes saved', 'The cleaned preview, issue highlights, and mapping changes were saved.');
    } catch (error) {
      showToast('Save failed', extractErrorMessage(error), 'fa-solid fa-triangle-exclamation');
    } finally {
      setExcelPreviewLoading(false);
    }
  }

  function updateExcelPreviewWorkspaceControls() {
    if (!dom.excelSubmissionWorkspace || !dom.excelPreviewDirtyState || !dom.excelSaveEditsBtn || !dom.excelRecheckIssuesBtn) {
      return;
    }

    const preview = state.excelPreview;
    const isWorkspace = isExcelSubmissionWorkspace(preview);
    const isEditable = canEditData();
    toggleElement(dom.excelSubmissionWorkspace, isWorkspace);
    if (!isWorkspace) {
      return;
    }

    dom.excelPreviewDirtyState.innerHTML = !isEditable
      ? '<i class="fa-solid fa-eye"></i>Read-only access'
      : (preview.isDirty
        ? '<i class="fa-solid fa-pen-ruler"></i>Unsaved changes'
        : '<i class="fa-solid fa-circle-check"></i>Preview synced');
    toggleElement(dom.excelSaveEditsBtn, isEditable);
    toggleElement(dom.excelRecheckIssuesBtn, isEditable);
    dom.excelSaveEditsBtn.disabled = !isEditable || !preview.isDirty;
    dom.excelRecheckIssuesBtn.disabled = !isEditable;
    if (dom.excelMappingTemplateSelect) {
      dom.excelMappingTemplateSelect.disabled = !isEditable;
    }
  }

  async function saveSubmissionStatusUpdate(submissionId, options = {}) {
    if (!canApproveSubmissions()) {
      showToast('Access denied', 'Only Super Admins and Reviewers can review incoming Excel submissions.', 'fa-solid fa-lock');
      return;
    }

    const existingSubmission = state.dataSubmissions.find((item) => Number(item.id) === submissionId);
    if (!existingSubmission) {
      return;
    }

    const statusSelect = dom.incomingDataList?.querySelector(`[data-submission-status-id="${submissionId}"]`);
    const feedbackInput = dom.incomingDataList?.querySelector(`[data-submission-feedback-id="${submissionId}"]`);
    const nextStatus = String(options.forcedStatus || (statusSelect ? statusSelect.value.trim() : existingSubmission.status)).trim() || existingSubmission.status;
    const adminFeedback = feedbackInput ? feedbackInput.value.trim() : '';

    if (['Needs Revision', 'Rejected'].includes(nextStatus) && !adminFeedback) {
      showToast('Feedback required', 'Add a reason before saving Needs Revision or Rejected.', 'fa-solid fa-triangle-exclamation');
      return;
    }

    try {
      const updatedSubmission = await apiRequest(`/data-submissions/${submissionId}/status/`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: nextStatus,
          admin_feedback: adminFeedback,
        }),
      });
      state.dataSubmissions = state.dataSubmissions.map((item) => (
        Number(item.id) === submissionId ? updatedSubmission : item
      ));
      if (state.excelPreview && Number(state.excelPreview.sourceSubmissionId) === submissionId) {
        state.excelPreview.sourceSubmissionStatus = updatedSubmission.status;
        state.excelPreview.sourceSubmissionFeedback = updatedSubmission.admin_feedback || '';
      }
      renderIncomingData();
      renderExcelPreview();
      await refreshNotificationsOnly();
      showToast('Submission updated', `${updatedSubmission.original_filename} is now ${updatedSubmission.status}.`);
    } catch (error) {
      showToast('Update failed', extractErrorMessage(error), 'fa-solid fa-triangle-exclamation');
    }
  }

  function revealExcelPreviewPanel() {
    if (!dom.excelPreviewPanel) {
      return;
    }

    toggleElement(dom.excelPreviewPanel, true);
    dom.excelPreviewPanel.classList.remove('excel-preview-flash');
    void dom.excelPreviewPanel.offsetWidth;
    dom.excelPreviewPanel.classList.add('excel-preview-flash');
    dom.excelPreviewPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });

    window.setTimeout(() => {
      dom.excelPreviewSearch?.focus({ preventScroll: true });
    }, 250);

    window.setTimeout(() => {
      dom.excelPreviewPanel?.classList.remove('excel-preview-flash');
    }, 1600);
  }

  function setExcelPreviewLoading(isLoading) {
    toggleElement(dom.excelPreviewLoading, isLoading);
    if (dom.uploadExcelBtn) {
      dom.uploadExcelBtn.disabled = isLoading;
    }
    if (dom.clearExcelPreviewBtn) {
      dom.clearExcelPreviewBtn.disabled = isLoading;
    }
    if (dom.excelSaveEditsBtn) {
      dom.excelSaveEditsBtn.disabled = isLoading || !state.excelPreview?.isDirty;
    }
    if (dom.excelRecheckIssuesBtn) {
      dom.excelRecheckIssuesBtn.disabled = isLoading;
    }
    if (dom.excelMappingTemplateSelect) {
      dom.excelMappingTemplateSelect.disabled = isLoading;
    }
  }

  function setExcelPreviewError(message) {
    if (!dom.excelPreviewError) {
      return;
    }
    dom.excelPreviewError.textContent = message || '';
    toggleElement(dom.excelPreviewError, !!message);
  }

  function handleExcelPreviewSearch(event) {
    if (!state.excelPreview) {
      return;
    }
    state.excelPreview.search = event.target.value.trim().toLowerCase();
    state.excelPreview.currentPage = 1;
    renderExcelPreview();
  }

  function handleExcelPreviewTableInput(event) {
    const cellInput = event.target.closest('[data-excel-cell-input]');
    if (!cellInput || !state.excelPreview || !canEditData()) {
      return;
    }

    const rowIndex = Number(cellInput.dataset.rowIndex);
    const columnIndex = Number(cellInput.dataset.columnIndex);
    if (!Number.isInteger(rowIndex) || !Number.isInteger(columnIndex) || !Array.isArray(state.excelPreview.rows[rowIndex])) {
      return;
    }

    state.excelPreview.rows[rowIndex][columnIndex] = cellInput.value;
    state.excelPreview.total_rows = state.excelPreview.rows.length;
    state.excelPreview.max_preview_rows = state.excelPreview.rows.length;
    setExcelPreviewDirty(true);
  }

  function handleExcelPreviewTableChange(event) {
    const cellInput = event.target.closest('[data-excel-cell-input]');
    if (!cellInput || !state.excelPreview || !canEditData()) {
      return;
    }

    const rowIndex = Number(cellInput.dataset.rowIndex);
    const columnIndex = Number(cellInput.dataset.columnIndex);
    if (!Number.isInteger(rowIndex) || !Number.isInteger(columnIndex) || !Array.isArray(state.excelPreview.rows[rowIndex])) {
      return;
    }

    state.excelPreview.rows[rowIndex][columnIndex] = cellInput.value;
    validateExcelSubmissionWorkspace({ silent: true });
  }

  function handleExcelPreviewTableClick(event) {
    const removeRowButton = event.target.closest('[data-action="remove-excel-preview-row"]');
    if (removeRowButton && state.excelPreview && canEditData()) {
      const rowIndex = Number(removeRowButton.dataset.rowIndex);
      if (Number.isInteger(rowIndex)) {
        state.excelPreview.rows.splice(rowIndex, 1);
        state.excelPreview.total_rows = state.excelPreview.rows.length;
        state.excelPreview.max_preview_rows = state.excelPreview.rows.length;
        state.excelPreview.currentPage = 1;
        setExcelPreviewDirty(true);
        renderExcelPreview();
        validateExcelSubmissionWorkspace({ silent: true });
      }
      return;
    }

    const sortButton = event.target.closest('[data-sort-index]');
    if (!sortButton || !state.excelPreview) {
      return;
    }
    const sortIndex = Number(sortButton.dataset.sortIndex);
    if (!Number.isInteger(sortIndex)) {
      return;
    }
    if (state.excelPreview.sortIndex === sortIndex) {
      state.excelPreview.sortDirection = state.excelPreview.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      state.excelPreview.sortIndex = sortIndex;
      state.excelPreview.sortDirection = 'asc';
    }
    state.excelPreview.currentPage = 1;
    renderExcelPreview();
  }

  function changeExcelPreviewPage(direction) {
    if (!state.excelPreview) {
      return;
    }
    const totalPages = Math.max(1, Math.ceil(getExcelPreviewRows().length / state.excelPreview.pageSize));
    const nextPage = Math.min(totalPages, Math.max(1, state.excelPreview.currentPage + direction));
    if (nextPage === state.excelPreview.currentPage) {
      return;
    }
    state.excelPreview.currentPage = nextPage;
    renderExcelPreview();
  }

  function handleExcelPreviewTemplateChange(event) {
    if (!state.excelPreview || !canEditData()) {
      return;
    }

    state.excelPreview.mappingProfileKey = event.target.value.trim();
    state.excelPreview.columnMapping = {};
    setExcelPreviewDirty(true);
    validateExcelSubmissionWorkspace({ silent: true });
  }

  function handleExcelPreviewMappingChange(event) {
    const mappingSelect = event.target.closest('[data-excel-mapping-field]');
    if (!mappingSelect || !state.excelPreview || !canEditData()) {
      return;
    }

    const fieldName = mappingSelect.dataset.excelMappingField;
    if (!fieldName) {
      return;
    }

    const columnMapping = normalizeColumnMapping(state.excelPreview.columnMapping);
    const nextHeader = mappingSelect.value.trim();
    if (nextHeader) {
      columnMapping[fieldName] = nextHeader;
    } else {
      delete columnMapping[fieldName];
    }
    state.excelPreview.columnMapping = columnMapping;
    setExcelPreviewDirty(true);
    validateExcelSubmissionWorkspace({ silent: true });
  }

  function renderExcelPreview() {
    if (!dom.excelPreviewPanel || !canAccessAdminDashboard()) {
      return;
    }

    const preview = state.excelPreview;
    toggleElement(dom.clearExcelPreviewBtn, !!preview);
    toggleElement(dom.excelPreviewContent, !!preview);

    if (!preview) {
      dom.excelPreviewMeta.textContent = 'Choose a `.csv`, `.xls`, or `.xlsx` file to preview its contents here.';
      dom.excelPreviewRowsCount.innerHTML = '<i class="fa-solid fa-table-list"></i>0 rows';
      dom.excelPreviewColumnsCount.innerHTML = '<i class="fa-solid fa-table-columns"></i>0 columns';
      dom.excelPreviewHint.textContent = 'Preview the uploaded file here before taking any further action.';
      dom.excelPreviewPageInfo.innerHTML = '<i class="fa-solid fa-book-open"></i>Page 1 of 1';
      dom.excelPreviewTableWrap.innerHTML = '<div class="excel-empty-state">No CSV or Excel file preview loaded yet.</div>';
      dom.excelPrevPageBtn.disabled = true;
      dom.excelNextPageBtn.disabled = true;
      toggleElement(dom.excelSubmissionWorkspace, false);
      if (dom.excelValidationList) {
        dom.excelValidationList.innerHTML = '';
      }
      if (dom.excelMappingFields) {
        dom.excelMappingFields.innerHTML = '';
      }
      if (dom.excelReviewHistoryCount) {
        dom.excelReviewHistoryCount.innerHTML = '<i class="fa-solid fa-timeline"></i>0 events';
      }
      if (dom.excelReviewHistoryList) {
        dom.excelReviewHistoryList.innerHTML = '';
      }
      if (dom.excelVersionComparisonPill) {
        dom.excelVersionComparisonPill.innerHTML = '<i class="fa-solid fa-code-compare"></i>No prior version';
      }
      if (dom.excelVersionComparisonSummary) {
        dom.excelVersionComparisonSummary.innerHTML = '';
      }
      if (dom.excelVersionComparisonList) {
        dom.excelVersionComparisonList.innerHTML = '';
      }
      return;
    }

    const filteredRows = getExcelPreviewRows();
    const totalPages = Math.max(1, Math.ceil(filteredRows.length / preview.pageSize));
    preview.currentPage = Math.min(totalPages, Math.max(1, preview.currentPage));
    const startIndex = (preview.currentPage - 1) * preview.pageSize;
    const pageRows = filteredRows.slice(startIndex, startIndex + preview.pageSize);

    const previewMetaParts = [
      preview.file_name,
      `Table: ${preview.sheet_name}`,
      `${preview.total_rows} row(s) detected`,
    ];
    if (preview.sourceSubmissionSender) {
      previewMetaParts.push(`Sent by ${preview.sourceSubmissionSender}`);
    }
    if (preview.sourceSubmissionStatus) {
      previewMetaParts.push(`Status: ${preview.sourceSubmissionStatus}`);
    }
    if (preview.sourceSubmissionFeedback) {
      previewMetaParts.push('Feedback available');
    }
    if (isExcelSubmissionWorkspace(preview)) {
      previewMetaParts.push('Inline editing enabled');
    }
    dom.excelPreviewMeta.textContent = `${previewMetaParts.join(' | ')}.`;
    dom.excelPreviewRowsCount.innerHTML = `<i class="fa-solid fa-table-list"></i>${preview.total_rows} row(s)`;
    dom.excelPreviewColumnsCount.innerHTML = `<i class="fa-solid fa-table-columns"></i>${preview.total_columns} column(s)`;
    if (preview.preview_truncated) {
      dom.excelPreviewHint.textContent = `Showing the first ${preview.max_preview_rows} row(s) stored for fast preview. Download the original file if you need the full data.`;
    } else if (isExcelSubmissionWorkspace(preview) && !canEditData()) {
      dom.excelPreviewHint.textContent = 'You have read-only access to this submission. Open the review history and version comparison panels for context.';
    } else if (isExcelSubmissionWorkspace(preview) && preview.isDirty) {
      dom.excelPreviewHint.textContent = 'You have unsaved preview edits. Recheck the issues or save the fixes when you are ready.';
    } else if (preview.sourceSubmissionFeedback) {
      dom.excelPreviewHint.textContent = `Latest admin feedback: ${preview.sourceSubmissionFeedback}`;
    } else if (isExcelSubmissionWorkspace(preview)) {
      dom.excelPreviewHint.textContent = 'Edit cells directly, remove bad rows, remap headers, and save the cleaned preview for review.';
    } else if (preview.sourceSubmissionSender) {
      dom.excelPreviewHint.textContent = `Loaded from a user submission sent by ${preview.sourceSubmissionSender}.`;
    } else {
      dom.excelPreviewHint.textContent = 'Preview the uploaded file here before taking any further action.';
    }
    dom.excelPreviewPageInfo.innerHTML = `<i class="fa-solid fa-book-open"></i>Page ${preview.currentPage} of ${totalPages}`;
    dom.excelPrevPageBtn.disabled = preview.currentPage <= 1;
    dom.excelNextPageBtn.disabled = preview.currentPage >= totalPages;
    renderExcelPreviewWorkspace(preview);

    if (!pageRows.length) {
      dom.excelPreviewTableWrap.innerHTML = '<div class="excel-empty-state">No rows match your current search.</div>';
      return;
    }

    const issueMaps = buildExcelPreviewIssueMaps(preview.validation || {});
    const isWorkspace = isExcelSubmissionWorkspace(preview);
    const isEditableWorkspace = isWorkspace && canEditData();
    const headerMarkup = preview.headers.map((header, index) => `
      <th>
        <button class="excel-sort-btn" type="button" data-sort-index="${index}">
          <span>${escapeHtml(header)}</span>
          <i class="${getExcelSortIcon(index)}"></i>
        </button>
      </th>
    `).join('');

    const bodyMarkup = pageRows.map((rowEntry) => {
      const rowIssue = issueMaps.rowIssues.get(rowEntry.sourceIndex);
      const rowClassName = rowIssue ? `excel-preview-row has-${rowIssue.tone}` : 'excel-preview-row';
      const rowTitle = rowIssue ? escapeAttribute(rowIssue.messages.join(' ')) : '';
      const cellsMarkup = rowEntry.row.map((cell, columnIndex) => {
        const cellIssue = issueMaps.cellIssues.get(`${rowEntry.sourceIndex}:${columnIndex}`);
        const toneClass = cellIssue ? `excel-preview-cell has-${cellIssue.tone}` : 'excel-preview-cell';
        const titleAttribute = cellIssue ? ` title="${escapeAttribute(cellIssue.message)}"` : '';
        if (isEditableWorkspace) {
          return `
            <td class="${toneClass}"${titleAttribute}>
              <input
                class="excel-inline-input ${cellIssue ? `is-${cellIssue.tone}` : ''}"
                data-excel-cell-input="true"
                data-row-index="${rowEntry.sourceIndex}"
                data-column-index="${columnIndex}"
                value="${escapeAttribute(cell || '')}"
              />
            </td>
          `;
        }
        return `<td class="${toneClass}"${titleAttribute}>${escapeHtml(cell || '')}</td>`;
      }).join('');

      return `
        <tr class="${rowClassName}" ${rowTitle ? `title="${rowTitle}"` : ''}>
          <td class="row-index">Row ${rowEntry.sourceIndex + 1}</td>
          ${cellsMarkup}
          ${isEditableWorkspace ? `
            <td class="excel-row-actions-cell">
              <button class="btn btn-danger excel-row-remove-btn" type="button" data-action="remove-excel-preview-row" data-row-index="${rowEntry.sourceIndex}">
                <i class="fa-solid fa-trash"></i>Remove
              </button>
            </td>
          ` : ''}
        </tr>
      `;
    }).join('');

    dom.excelPreviewTableWrap.innerHTML = `
      <table class="excel-preview-table ${isEditableWorkspace ? 'is-editable' : ''}">
        <thead>
          <tr>
            <th class="row-index">Row</th>
            ${headerMarkup}
            ${isEditableWorkspace ? '<th class="excel-row-actions-head">Actions</th>' : ''}
          </tr>
        </thead>
        <tbody>
          ${bodyMarkup}
        </tbody>
      </table>
    `;
  }

  function getExcelPreviewRows() {
    if (!state.excelPreview) {
      return [];
    }

    let rows = state.excelPreview.rows.map((row, sourceIndex) => ({
      sourceIndex,
      row: Array.isArray(row) ? row.slice() : [],
    }));
    if (state.excelPreview.search) {
      rows = rows.filter((rowEntry) => rowEntry.row.join(' ').toLowerCase().includes(state.excelPreview.search));
    }
    if (Number.isInteger(state.excelPreview.sortIndex)) {
      const columnIndex = state.excelPreview.sortIndex;
      const direction = state.excelPreview.sortDirection === 'desc' ? -1 : 1;
      rows.sort((leftRow, rightRow) => compareExcelPreviewValues(leftRow.row[columnIndex], rightRow.row[columnIndex]) * direction);
    }
    return rows;
  }

  function renderExcelPreviewWorkspace(preview) {
    if (!dom.excelSubmissionWorkspace) {
      return;
    }

    const isWorkspace = isExcelSubmissionWorkspace(preview);
    toggleElement(dom.excelSubmissionWorkspace, isWorkspace);
    if (!isWorkspace) {
      return;
    }

    updateExcelPreviewWorkspaceControls();
    renderExcelPreviewMapping(preview);
    renderExcelPreviewValidation(preview.validation || {});
    renderExcelPreviewReviewHistory(preview);
    renderExcelPreviewVersionComparison(preview);
  }

  function renderExcelPreviewMapping(preview) {
    if (!dom.excelMappingTemplateSelect || !dom.excelMappingHelp || !dom.excelMappingFields) {
      return;
    }

    const validation = preview.validation || {};
    const isEditable = canEditData();
    const templates = Array.isArray(validation.available_templates) ? validation.available_templates : [];
    const selectedProfileKey = preview.mappingProfileKey || '';
    dom.excelMappingTemplateSelect.innerHTML = [
      '<option value="">Auto detect template</option>',
      ...templates.map((template) => `<option value="${escapeAttribute(template.key)}">${escapeHtml(template.label)}</option>`),
    ].join('');
    dom.excelMappingTemplateSelect.value = selectedProfileKey;

    if (!selectedProfileKey) {
      dom.excelMappingHelp.textContent = validation.profile_key && validation.profile_key !== 'generic'
        ? `Auto-detected as ${validation.profile_label}. Choose a template only if you want to override the detected mapping.`
        : 'Choose a template if you need to map inconsistent headers to the correct system fields.';
      dom.excelMappingFields.innerHTML = buildEmptyState('Template mapping is optional for this preview.');
      return;
    }

    const requiredColumns = Array.isArray(validation.required_columns) ? validation.required_columns : [];
    const missingColumns = Array.isArray(validation.missing_required_columns) ? validation.missing_required_columns : [];
    const mappingOptions = Array.isArray(validation.mapping_options) ? validation.mapping_options : preview.headers;
    const appliedMapping = normalizeColumnMapping(preview.columnMapping || validation.applied_column_mapping);
    const mappedCount = requiredColumns.filter((fieldName) => !!appliedMapping[fieldName]).length;
    dom.excelMappingHelp.textContent = `${mappedCount} of ${requiredColumns.length} required field(s) are currently mapped for ${validation.profile_label || 'the selected template'}.`;

    if (!requiredColumns.length) {
      dom.excelMappingFields.innerHTML = buildEmptyState('No required fields are defined for the selected template.');
      return;
    }

    dom.excelMappingFields.innerHTML = requiredColumns.map((fieldName) => `
      <div class="list-item send-data-mapping-item">
        <div>
          <strong>${escapeHtml(fieldName)}</strong>
          <p>${missingColumns.includes(fieldName) ? 'This required field still needs a mapped column.' : `Mapped to ${appliedMapping[fieldName] || 'an automatically detected column'}.`}</p>
        </div>
        <div class="filter-box send-data-mapping-select">
          <i class="fa-solid fa-table-columns"></i>
          <select data-excel-mapping-field="${escapeAttribute(fieldName)}" ${isEditable ? '' : 'disabled'}>
            <option value="">Not mapped</option>
            ${mappingOptions.map((headerName) => `
              <option value="${escapeAttribute(headerName)}" ${appliedMapping[fieldName] === headerName ? 'selected' : ''}>
                ${escapeHtml(headerName)}
              </option>
            `).join('')}
          </select>
        </div>
      </div>
    `).join('');
  }

  function renderExcelPreviewValidation(validation) {
    if (!dom.excelValidationProfile || !dom.excelValidationIssueCount || !dom.excelValidationList) {
      return;
    }

    const issueCount = Number(validation.issue_count) || 0;
    const missingColumns = Array.isArray(validation.missing_required_columns) ? validation.missing_required_columns : [];
    const missingValueMessages = Array.isArray(validation.missing_value_messages) ? validation.missing_value_messages : [];
    const invalidFormatMessages = Array.isArray(validation.invalid_format_messages) ? validation.invalid_format_messages : [];
    const duplicateCount = Number(validation.duplicate_count) || 0;
    dom.excelValidationProfile.textContent = validation.template_message || 'Issue analysis will appear here for opened user submissions.';
    dom.excelValidationIssueCount.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i>${issueCount} issue(s)`;

    const validationCards = [
      buildValidationItem(
        'Missing required columns',
        missingColumns.length
          ? `Missing: ${missingColumns.join(', ')}`
          : 'No required columns are missing for the current mapping.',
        missingColumns.length ? 'warning' : 'success',
        missingColumns.length ? 'fa-solid fa-table-columns' : 'fa-solid fa-circle-check'
      ),
      buildValidationItem(
        'Missing values',
        missingValueMessages.length
          ? missingValueMessages.join(' ')
          : 'No missing required values were detected in the current preview rows.',
        missingValueMessages.length ? 'error' : 'success',
        missingValueMessages.length ? 'fa-solid fa-circle-exclamation' : 'fa-solid fa-circle-check'
      ),
      buildValidationItem(
        'Wrong formats',
        invalidFormatMessages.length
          ? invalidFormatMessages.join(' ')
          : 'No invalid date, category, or email formats were detected.',
        invalidFormatMessages.length ? 'error' : 'success',
        invalidFormatMessages.length ? 'fa-solid fa-triangle-exclamation' : 'fa-solid fa-circle-check'
      ),
      buildValidationItem(
        'Duplicate rows',
        validation.duplicate_message || 'No duplicate entries were detected in the current table preview.',
        duplicateCount ? 'warning' : 'success',
        duplicateCount ? 'fa-solid fa-copy' : 'fa-solid fa-circle-check'
      ),
    ];

    dom.excelValidationList.innerHTML = validationCards.join('');
  }

  function renderExcelPreviewReviewHistory(preview) {
    if (!dom.excelReviewHistoryList || !dom.excelReviewHistoryCount || !dom.excelReviewHistoryMeta) {
      return;
    }

    const reviewHistory = Array.isArray(preview.reviewHistory) ? preview.reviewHistory : [];
    dom.excelReviewHistoryMeta.textContent = preview.priority && preview.priority.is_high_priority
      ? `High-priority file. ${preview.priority.priority_reason || 'Track who reviewed this file and what changed.'}`
      : 'Track who reviewed this file, when they touched it, and what changed at each step.';
    dom.excelReviewHistoryCount.innerHTML = `<i class="fa-solid fa-timeline"></i>${reviewHistory.length} event${reviewHistory.length === 1 ? '' : 's'}`;

    if (!reviewHistory.length) {
      dom.excelReviewHistoryList.innerHTML = buildEmptyState('Review actions will appear here after admins start working on this file.');
      return;
    }

    dom.excelReviewHistoryList.innerHTML = reviewHistory.map((entry) => {
      const details = entry && typeof entry.details === 'object' ? entry.details : {};
      const detailPills = [];
      if (details.previous_status || details.next_status) {
        detailPills.push(`${details.previous_status || 'Unknown'} -> ${details.next_status || 'Unknown'}`);
      }
      if (details.comparison_summary) {
        detailPills.push(details.comparison_summary);
      }
      if (Array.isArray(details.mapping_changes) && details.mapping_changes.length) {
        detailPills.push(`${details.mapping_changes.length} mapping field(s) updated`);
      }

      return `
        <article class="submission-history-item">
          <div class="submission-history-icon">
            <i class="${escapeHtml(getSubmissionHistoryActionIcon(entry.action_key))}"></i>
          </div>
          <div class="submission-history-main">
            <div class="submission-history-head">
              <strong>${escapeHtml(entry.title || 'Submission updated')}</strong>
              <span class="mini-pill"><i class="fa-solid fa-clock"></i>${formatDateTime(entry.changed_at)}</span>
            </div>
            <p>${escapeHtml(entry.summary || 'No summary was recorded for this action.')}</p>
            <div class="submission-audit-meta">
              <span class="mini-pill"><i class="fa-solid fa-user-check"></i>${escapeHtml(entry.changed_by_label || 'System')}</span>
              ${detailPills.map((detail) => `<span class="mini-pill">${escapeHtml(detail)}</span>`).join('')}
            </div>
            ${buildSubmissionDiffListMarkup(Array.isArray(details.changes) ? details.changes : [], {
              emptyMessage: '',
              limit: 4,
            })}
          </div>
        </article>
      `;
    }).join('');
  }

  function renderExcelPreviewVersionComparison(preview) {
    if (!dom.excelVersionComparisonSummary || !dom.excelVersionComparisonList || !dom.excelVersionComparisonPill || !dom.excelVersionComparisonMeta) {
      return;
    }

    const comparison = preview.versionComparison && typeof preview.versionComparison === 'object'
      ? preview.versionComparison
      : {};
    const metrics = comparison.metrics && typeof comparison.metrics === 'object'
      ? comparison.metrics
      : {};
    const hasPreviousVersion = !!comparison.has_previous_version;

    if (!hasPreviousVersion) {
      dom.excelVersionComparisonMeta.textContent = 'Compare this upload against the previous version from the same sender.';
      dom.excelVersionComparisonPill.innerHTML = '<i class="fa-solid fa-code-compare"></i>No prior version';
      dom.excelVersionComparisonSummary.innerHTML = `
        <div class="submission-version-summary-card">
          <strong>No earlier version yet</strong>
          <p>${escapeHtml(comparison.summary || 'Upload version 2 or later to unlock old vs new comparison here.')}</p>
        </div>
      `;
      dom.excelVersionComparisonList.innerHTML = buildEmptyState('Resubmitted files will show the previous version differences here.');
      return;
    }

    dom.excelVersionComparisonMeta.textContent = `Comparing ${comparison.previous_version_label || 'the previous version'} with ${comparison.current_version_label || 'the current version'} from this sender.`;
    dom.excelVersionComparisonPill.innerHTML = `<i class="fa-solid fa-code-compare"></i>${escapeHtml(comparison.previous_version_label || 'Previous')} to ${escapeHtml(comparison.current_version_label || 'Current')}`;
    dom.excelVersionComparisonSummary.innerHTML = `
      <div class="submission-version-summary-card">
        <strong>${escapeHtml(comparison.summary || 'Version differences are summarized below.')}</strong>
        <p>Previous file: ${escapeHtml(comparison.previous_version_label || 'Earlier version')} | ${escapeHtml(formatDateTime(comparison.previous_created_at))}</p>
        <div class="submission-audit-meta">
          <span class="mini-pill"><i class="fa-solid fa-table-columns"></i>${Number(metrics.header_change_count) || 0} header change(s)</span>
          <span class="mini-pill"><i class="fa-solid fa-pen"></i>${Number(metrics.cell_changed_count) || 0} edited cell(s)</span>
          <span class="mini-pill"><i class="fa-solid fa-circle-plus"></i>${Number(metrics.row_added_count) || 0} row(s) added</span>
          <span class="mini-pill"><i class="fa-solid fa-circle-minus"></i>${Number(metrics.row_removed_count) || 0} row(s) removed</span>
        </div>
      </div>
    `;
    dom.excelVersionComparisonList.innerHTML = buildSubmissionDiffListMarkup(
      Array.isArray(comparison.items) ? comparison.items : [],
      {
        emptyMessage: 'This resubmission matches the previous version in the stored preview rows.',
        limit: 8,
      }
    );
  }

  function getSubmissionHistoryActionIcon(actionKey) {
    if (actionKey === 'submitted') {
      return 'fa-solid fa-paper-plane';
    }
    if (actionKey === 'draft_saved') {
      return 'fa-solid fa-floppy-disk';
    }
    if (actionKey === 'status_updated') {
      return 'fa-solid fa-clipboard-check';
    }
    if (actionKey === 'workspace_saved') {
      return 'fa-solid fa-pen-ruler';
    }
    return 'fa-solid fa-clock-rotate-left';
  }

  function buildSubmissionDiffListMarkup(items, options = {}) {
    const normalizedItems = Array.isArray(items) ? items.slice(0, options.limit || items.length) : [];
    if (!normalizedItems.length) {
      return options.emptyMessage ? buildEmptyState(options.emptyMessage) : '';
    }

    return `
      <div class="submission-diff-list">
        ${normalizedItems.map((item) => `
          <div class="submission-diff-item">
            <strong>${escapeHtml(item.label || 'Change')}</strong>
            <div class="submission-diff-values">
              <div>
                <small>Before</small>
                <p>${escapeHtml(item.before || '—')}</p>
              </div>
              <div>
                <small>After</small>
                <p>${escapeHtml(item.after || '—')}</p>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  function buildExcelPreviewIssueMaps(validation) {
    const rowIssues = new Map();
    const cellIssues = new Map();
    (Array.isArray(validation.row_issues) ? validation.row_issues : []).forEach((issue) => {
      rowIssues.set(Number(issue.row_index), issue);
    });
    (Array.isArray(validation.cell_issues) ? validation.cell_issues : []).forEach((issue) => {
      cellIssues.set(`${Number(issue.row_index)}:${Number(issue.column_index)}`, issue);
    });
    return { rowIssues, cellIssues };
  }

  function compareExcelPreviewValues(leftValue, rightValue) {
    const left = String(leftValue || '').trim();
    const right = String(rightValue || '').trim();
    const leftNumber = Number(left);
    const rightNumber = Number(right);
    if (left !== '' && right !== '' && !Number.isNaN(leftNumber) && !Number.isNaN(rightNumber)) {
      return leftNumber - rightNumber;
    }
    return left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' });
  }

  function getExcelSortIcon(index) {
    if (!state.excelPreview || state.excelPreview.sortIndex !== index) {
      return 'fa-solid fa-sort';
    }
    return state.excelPreview.sortDirection === 'desc' ? 'fa-solid fa-sort-down' : 'fa-solid fa-sort-up';
  }

  function toggleElement(element, shouldShow) {
    if (!element) return;
    element.classList.toggle('hidden', !shouldShow);
  }

  function normalizeRoleValue(userOrRole) {
    const rawRole = typeof userOrRole === 'string'
      ? userOrRole
      : (userOrRole && typeof userOrRole === 'object' ? userOrRole.role : '');
    const trimmedRole = String(rawRole || '').trim();
    return ROLE_LEGACY_MAP[trimmedRole] || trimmedRole;
  }

  function canViewUsers() {
    return normalizeRoleValue(state.user) === 'Super Admin';
  }

  function canManageUsers() {
    return normalizeRoleValue(state.user) === 'Super Admin';
  }

  function canManageRecycle() {
    return normalizeRoleValue(state.user) === 'Super Admin';
  }

  function canDeleteContent() {
    return DELETE_ROLES.has(normalizeRoleValue(state.user));
  }

  function canEditData() {
    return DATA_EDITOR_ROLES.has(normalizeRoleValue(state.user));
  }

  function canApproveSubmissions() {
    return DATA_EDITOR_ROLES.has(normalizeRoleValue(state.user));
  }

  function canAccessAdminDashboard() {
    return ADMIN_DASHBOARD_ROLES.has(normalizeRoleValue(state.user));
  }

  function getUserRoleBadgeClass(role) {
    return ADMIN_DASHBOARD_ROLES.has(normalizeRoleValue(role)) ? 'status-admin' : 'status-user';
  }

  function getUserStatusBadgeClass(status) {
    if (status === 'Pending Approval') {
      return 'status-pending';
    }
    return status === 'Active' ? 'status-active' : 'status-inactive';
  }

  function buildUserQuickStatusAction(user) {
    if (!canManageUsers()) {
      return '';
    }
    if (state.user && Number(state.user.id) === Number(user.id)) {
      return '';
    }
    if (user.status === 'Pending Approval') {
      return `<button class="btn btn-success action-btn" data-action="set-user-status" data-status="Active" data-id="${user.id}"><i class="fa-solid fa-user-check"></i>Approve</button>`;
    }
    if (user.status === 'Active') {
      return `<button class="btn btn-warning action-btn" data-action="set-user-status" data-status="Inactive" data-id="${user.id}"><i class="fa-solid fa-user-slash"></i>Deactivate</button>`;
    }
    return `<button class="btn btn-success action-btn" data-action="set-user-status" data-status="Active" data-id="${user.id}"><i class="fa-solid fa-user-check"></i>Activate</button>`;
  }

  function getDefaultPageForUser() {
    return canAccessAdminDashboard() ? 'dashboard' : 'sent-data';
  }

  function setAuthMode(mode) {
    const viewMap = {
      login: dom.loginView,
      register: dom.registerView,
      'forgot-password': dom.forgotPasswordView,
      'two-factor': dom.twoFactorView,
    };
    Object.entries(viewMap).forEach(([key, element]) => {
      element?.classList.toggle('hidden', key !== mode);
    });
    const isRegister = mode === 'register';
    dom.showLoginBtn?.classList.toggle('active', mode !== 'register');
    dom.showRegisterBtn?.classList.toggle('active', isRegister);

    if (mode !== 'register') {
      dom.registerError.textContent = '';
    }
    if (mode !== 'login') {
      dom.loginError.textContent = '';
    }
    if (mode !== 'forgot-password') {
      dom.forgotPasswordError.textContent = '';
      dom.forgotPasswordSuccess.textContent = '';
    }
    if (mode !== 'two-factor') {
      dom.twoFactorError.textContent = '';
      dom.twoFactorSuccess.textContent = '';
      dom.twoFactorForm?.reset();
    }
    if (mode !== 'login') {
      dom.registerSuccess.textContent = '';
    }
  }

  function buildRecordRow(record) {
    const imageMarkup = record.image_url
      ? `<div class="thumb"><img src="${escapeHtml(record.image_url)}" alt="${escapeHtml(record.name)}"></div>`
      : '<div class="thumb"><i class="fa-regular fa-image"></i></div>';
    const actionMarkup = canEditData()
      ? `
        <div class="table-actions">
          <button class="btn btn-secondary action-btn" data-action="edit-record" data-id="${record.id}"><i class="fa-solid fa-pen"></i>Edit</button>
          ${canDeleteContent() ? `<button class="btn btn-danger action-btn" data-action="delete-record" data-id="${record.id}"><i class="fa-solid fa-trash"></i>Delete</button>` : ''}
        </div>
      `
      : '<span class="mini-pill"><i class="fa-solid fa-eye"></i>Read only</span>';
    return `
      <tr>
        <td>${imageMarkup}</td>
        <td>
          <div class="cell-title">
            <strong>${escapeHtml(record.name)}</strong>
            <small>${escapeHtml(record.description || 'No description provided.')}</small>
          </div>
        </td>
        <td>${escapeHtml(record.location)}</td>
        <td><span class="type-chip status-record">${escapeHtml(record.category)}</span></td>
        <td>${formatDateTime(record.updated_at)}</td>
        <td>${actionMarkup}</td>
      </tr>
    `;
  }

  function buildVisitorRow(visitor) {
    const actionMarkup = canEditData()
      ? `
        <div class="table-actions">
          <button class="btn btn-secondary action-btn" data-action="edit-visitor" data-id="${visitor.id}"><i class="fa-solid fa-pen"></i>Edit</button>
          ${canDeleteContent() ? `<button class="btn btn-danger action-btn" data-action="delete-visitor" data-id="${visitor.id}"><i class="fa-solid fa-trash"></i>Delete</button>` : ''}
        </div>
      `
      : '<span class="mini-pill"><i class="fa-solid fa-eye"></i>Read only</span>';
    return `
      <tr>
        <td>
          <div class="cell-title">
            <strong>${escapeHtml(visitor.name)}</strong>
            <small>Saved by ${escapeHtml(visitor.created_by_name || 'System')}</small>
          </div>
        </td>
        <td>${escapeHtml(visitor.place || visitor.tourism_record_name || '-')}</td>
        <td>${escapeHtml(visitor.origin)}</td>
        <td>${formatDateTime(visitor.visit_date)}</td>
        <td><span class="status-chip ${visitor.status === 'Checked In' ? 'status-checked-in' : 'status-checked-out'}">${escapeHtml(visitor.status)}</span></td>
        <td>${actionMarkup}</td>
      </tr>
    `;
  }

  function buildUserRow(user) {
    const roleClass = getUserRoleBadgeClass(user.role);
    const statusClass = getUserStatusBadgeClass(user.status);
    const emailVerifiedText = user.email_verified ? 'Email verified' : 'Email verification pending';
    const hasActiveLock = user.locked_until && new Date(user.locked_until).getTime() > Date.now();
    const lastSeenMarkup = user.last_login
      ? `
        <div class="cell-title">
          <strong>${escapeHtml(formatDateTime(user.last_login))}</strong>
          <small>${escapeHtml(timeAgoLong(user.last_login))}</small>
        </div>
      `
      : `
        <div class="cell-title">
          <strong>Never</strong>
          <small>No successful login yet</small>
        </div>
      `;
    const statusMeta = hasActiveLock
      ? `<small>Locked until ${escapeHtml(formatDateTime(user.locked_until))}</small>`
      : `<small>${escapeHtml(emailVerifiedText)}</small>`;
    const quickStatusAction = buildUserQuickStatusAction(user);
    return `
      <tr>
        <td>
          <div class="cell-title">
            <strong>${escapeHtml(user.name)}</strong>
            <small>@${escapeHtml(user.username)} | ${escapeHtml(user.email)}</small>
            <small>${escapeHtml(emailVerifiedText)}</small>
          </div>
        </td>
        <td>${escapeHtml(user.office || '-')}</td>
        <td><span class="status-chip ${roleClass}">${escapeHtml(normalizeRoleValue(user.role) || user.role)}</span></td>
        <td>
          <div class="cell-title">
            <strong><span class="status-chip ${statusClass}">${escapeHtml(user.status)}</span></strong>
            ${statusMeta}
          </div>
        </td>
        <td>${lastSeenMarkup}</td>
        <td>${formatDateTime(user.updated_at)}</td>
        <td>
          <div class="table-actions">
            ${quickStatusAction}
            ${canManageUsers() ? `<button class="btn btn-secondary action-btn" data-action="edit-user" data-id="${user.id}"><i class="fa-solid fa-pen"></i>Edit</button>` : ''}
            ${canManageUsers() ? `<button class="btn btn-danger action-btn" data-action="delete-user" data-id="${user.id}"><i class="fa-solid fa-trash"></i>Delete</button>` : ''}
          </div>
        </td>
      </tr>
    `;
  }

  function buildRecycleRow(item) {
    const name = item.item_name || readItemName(item.item_data) || `Item ${item.item_id}`;
    return `
      <tr>
        <td><span class="status-chip status-recycle">${escapeHtml(capitalize(item.item_type))}</span></td>
        <td>
          <div class="cell-title">
            <strong>${escapeHtml(name)}</strong>
            <small>ID: ${escapeHtml(String(item.item_id))}</small>
          </div>
        </td>
        <td>${formatDateTime(item.deleted_at)}</td>
        <td>
          <div class="table-actions">
            <button class="btn btn-success action-btn" data-action="restore-recycle" data-id="${item.id}"><i class="fa-solid fa-rotate-left"></i>Restore</button>
            <button class="btn btn-danger action-btn" data-action="purge-recycle" data-id="${item.id}"><i class="fa-solid fa-trash"></i>Purge</button>
          </div>
        </td>
      </tr>
    `;
  }

  function handleRecordTableClick(event) {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const id = Number(button.dataset.id);
    const record = state.records.find((item) => Number(item.id) === id);
    if (!record) return;

    if (button.dataset.action === 'edit-record') {
      if (!canEditData()) {
        showToast('Access denied', 'Only Super Admins and Reviewers can edit data.', 'fa-solid fa-lock');
        return;
      }
      openEntityModal('record', record);
      return;
    }

    if (button.dataset.action === 'delete-record') {
      openConfirm({
        title: 'Delete tourism record',
        subtitle: 'This action will move the item to the recycle bin.',
        content: `<p>Delete <strong>${escapeHtml(record.name)}</strong> from active records?</p>`,
        confirmText: 'Delete',
        onConfirm: async () => {
          try {
            await apiRequest(`/records/${record.id}/`, { method: 'DELETE' });
            closeConfirm();
            showToast('Record deleted', `${record.name} moved to recycle bin.`);
            await refreshAllData();
          } catch (error) {
            showToast('Delete failed', error.message, 'fa-solid fa-triangle-exclamation');
          }
        },
      });
    }
  }

  function handleVisitorTableClick(event) {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const id = Number(button.dataset.id);
    const visitor = state.visitors.find((item) => Number(item.id) === id);
    if (!visitor) return;

    if (button.dataset.action === 'edit-visitor') {
      if (!canEditData()) {
        showToast('Access denied', 'Only Super Admins and Reviewers can edit data.', 'fa-solid fa-lock');
        return;
      }
      openEntityModal('visitor', visitor);
      return;
    }

    if (button.dataset.action === 'delete-visitor') {
      openConfirm({
        title: 'Delete visitor entry',
        subtitle: 'This action will move the entry to the recycle bin.',
        content: `<p>Delete visitor <strong>${escapeHtml(visitor.name)}</strong>?</p>`,
        confirmText: 'Delete',
        onConfirm: async () => {
          try {
            await apiRequest(`/visitors/${visitor.id}/`, { method: 'DELETE' });
            closeConfirm();
            showToast('Visitor deleted', `${visitor.name} moved to recycle bin.`);
            await refreshAllData();
          } catch (error) {
            showToast('Delete failed', error.message, 'fa-solid fa-triangle-exclamation');
          }
        },
      });
    }
  }

  function handleUserTableClick(event) {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const id = Number(button.dataset.id);
    const user = state.users.find((item) => Number(item.id) === id);
    if (!user) return;

    if (button.dataset.action === 'edit-user') {
      openEntityModal('user', user);
      return;
    }

    if (button.dataset.action === 'set-user-status') {
      const nextStatus = String(button.dataset.status || '').trim();
      const actionLabel = nextStatus === 'Active' && user.status === 'Pending Approval'
        ? 'Approve user account'
        : nextStatus === 'Active'
          ? 'Activate user account'
          : 'Deactivate user account';
      const subtitle = nextStatus === 'Active'
        ? 'The user will be allowed to sign in again.'
        : 'The user will not be able to sign in until reactivated.';
      openConfirm({
        title: actionLabel,
        subtitle,
        content: `<p>Change <strong>${escapeHtml(user.name)}</strong> to <strong>${escapeHtml(nextStatus)}</strong>?</p>`,
        confirmText: nextStatus === 'Active' && user.status === 'Pending Approval' ? 'Approve' : nextStatus,
        onConfirm: async () => {
          try {
            await apiRequest(`/users/${user.id}/set-status/`, {
              method: 'POST',
              body: JSON.stringify({ status: nextStatus }),
            });
            closeConfirm();
            showToast('User updated', `${user.name} is now ${nextStatus}.`);
            await refreshAllData();
          } catch (error) {
            showToast('Update failed', extractErrorMessage(error), 'fa-solid fa-triangle-exclamation');
          }
        },
      });
      return;
    }

    if (button.dataset.action === 'delete-user') {
      openConfirm({
        title: 'Delete user account',
        subtitle: 'This action will deactivate the account and move it to the recycle bin.',
        content: `<p>Delete user account for <strong>${escapeHtml(user.name)}</strong>?</p>`,
        confirmText: 'Delete',
        onConfirm: async () => {
          try {
            await apiRequest(`/users/${user.id}/`, { method: 'DELETE' });
            closeConfirm();
            showToast('User deleted', `${user.name} moved to recycle bin.`);
            await refreshAllData();
          } catch (error) {
            showToast('Delete failed', error.message, 'fa-solid fa-triangle-exclamation');
          }
        },
      });
    }
  }

  function handleRecycleTableClick(event) {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const id = Number(button.dataset.id);
    const item = state.recycle.find((entry) => Number(entry.id) === id);
    if (!item) return;
    const itemName = item.item_name || readItemName(item.item_data) || `Item ${item.item_id}`;

    if (button.dataset.action === 'restore-recycle') {
      openConfirm({
        title: 'Restore item',
        subtitle: 'The item will be returned to its original table.',
        content: `<p>Restore <strong>${escapeHtml(itemName)}</strong>?</p>`,
        confirmText: 'Restore',
        onConfirm: async () => {
          try {
            await apiRequest(`/recycle-bin/${item.id}/restore/`, { method: 'POST' });
            closeConfirm();
            showToast('Item restored', `${itemName} has been restored.`);
            await refreshAllData();
          } catch (error) {
            showToast('Restore failed', error.message, 'fa-solid fa-triangle-exclamation');
          }
        },
      });
      return;
    }

    if (button.dataset.action === 'purge-recycle') {
      openConfirm({
        title: 'Permanently remove item',
        subtitle: 'This action cannot be undone.',
        content: `<p>Permanently remove <strong>${escapeHtml(itemName)}</strong>?</p>`,
        confirmText: 'Purge',
        onConfirm: async () => {
          try {
            await apiRequest(`/recycle-bin/${item.id}/purge/`, { method: 'DELETE' });
            closeConfirm();
            showToast('Item purged', `${itemName} was permanently removed.`);
            await refreshAllData();
          } catch (error) {
            showToast('Purge failed', error.message, 'fa-solid fa-triangle-exclamation');
          }
        },
      });
    }
  }

  function openEntityModal(entity, item = null) {
    let config = null;
    if (entity === 'record') {
      if (!canEditData()) {
        showToast('Access denied', 'Only Super Admins and Reviewers can edit data.', 'fa-solid fa-lock');
        return;
      }
      config = buildRecordModal(item);
    } else if (entity === 'visitor') {
      if (!canEditData()) {
        showToast('Access denied', 'Only Super Admins and Reviewers can edit data.', 'fa-solid fa-lock');
        return;
      }
      config = buildVisitorModal(item);
    } else if (entity === 'user') {
      if (!canManageUsers()) {
        showToast('Access denied', 'Only Super Admins can manage user accounts.', 'fa-solid fa-lock');
        return;
      }
      config = buildUserModal(item);
    } else if (entity === 'profile') {
      if (!state.user) {
        showToast('Sign in required', 'Please sign in before editing your profile.', 'fa-solid fa-lock');
        return;
      }
      config = buildProfileModal();
    } else if (entity === 'data-request') {
      if (!canApproveSubmissions()) {
        showToast('Access denied', 'Only Super Admins and Reviewers can request data from users.', 'fa-solid fa-lock');
        return;
      }
      config = buildDataRequestModal();
    }

    if (!config) return;

    dom.modalTitle.textContent = config.title;
    dom.modalSubtitle.textContent = config.subtitle;
    dom.modalBody.innerHTML = config.body;
    dom.entityForm.dataset.entity = entity;
    dom.entityForm.dataset.id = item && item.id ? String(item.id) : '';
    dom.saveModalBtn.innerHTML = config.saveText || '<i class="fa-solid fa-floppy-disk"></i>Save';
    dom.modalBackdrop.classList.add('show');

    if (entity === 'record') {
      const fileInput = document.getElementById('recordImageInput');
      if (fileInput) {
        fileInput.addEventListener('change', handleRecordImagePreview);
      }
    }

    if (entity === 'profile') {
      const fileInput = document.getElementById('profilePictureInput');
      if (fileInput) {
        fileInput.addEventListener('change', handleProfilePicturePreview);
      }
    }

    if (entity === 'visitor') {
      const destinationSelect = document.getElementById('visitorDestination');
      if (destinationSelect) {
        destinationSelect.addEventListener('change', syncVisitorPlaceFromSelect);
      }
    }

    if (entity === 'data-request') {
      bindDataRequestModalControls();
    }
  }

  function closeModal() {
    dom.modalBackdrop.classList.remove('show');
    dom.entityForm.reset();
    dom.entityForm.dataset.entity = '';
    dom.entityForm.dataset.id = '';
    dom.modalBody.innerHTML = '';
    dom.saveModalBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i>Save';
  }

  function openConfirm({ title, subtitle, content, confirmText = 'Confirm', onConfirm }) {
    dom.confirmTitle.textContent = title || 'Confirm action';
    dom.confirmSubtitle.textContent = subtitle || 'Please review this action before continuing.';
    dom.confirmContent.innerHTML = content || '';
    dom.confirmActionBtn.textContent = confirmText;
    state.confirmHandler = async () => {
      dom.confirmActionBtn.disabled = true;
      try {
        await onConfirm();
      } finally {
        dom.confirmActionBtn.disabled = false;
      }
    };
    dom.confirmBackdrop.classList.add('show');
  }

  function closeConfirm() {
    dom.confirmBackdrop.classList.remove('show');
    dom.confirmContent.innerHTML = '';
    dom.confirmActionBtn.textContent = 'Confirm';
    state.confirmHandler = null;
  }

  function buildRecordModal(item) {
    const categories = ['Beach', 'Mountain', 'Heritage', 'Nature', 'Park', 'Event', 'Other'];
    const preview = item && item.image_url
      ? `<img src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.name)}">`
      : '<div><i class="fa-regular fa-image"></i><p>Upload a destination cover image.</p></div>';
    return {
      title: item ? 'Edit Tourism Record' : 'Add Tourism Record',
      subtitle: item ? 'Update destination details and media.' : 'Create a new tourism destination record.',
      body: `
        <div class="modal-grid">
          <div class="field">
            <label for="recordName">Place Name</label>
            <input class="form-control" id="recordName" name="name" type="text" value="${escapeAttribute(item ? item.name : '')}" required>
          </div>
          <div class="field">
            <label for="recordLocation">Location</label>
            <input class="form-control" id="recordLocation" name="location" type="text" value="${escapeAttribute(item ? item.location : '')}" required>
          </div>
          <div class="field span-2">
            <label for="recordCategory">Category</label>
            <select class="form-control" id="recordCategory" name="category" required>
              ${categories.map((category) => `<option value="${category}" ${item && item.category === category ? 'selected' : ''}>${category}</option>`).join('')}
            </select>
          </div>
          <div class="field span-2">
            <label for="recordDescription">Description</label>
            <textarea class="form-control" id="recordDescription" name="description" placeholder="Write a short destination description.">${escapeHtml(item ? item.description || '' : '')}</textarea>
          </div>
          <div class="field span-2">
            <label for="recordImageInput">Destination Image</label>
            <input class="form-control" id="recordImageInput" name="image_path" type="file" accept="image/*">
          </div>
          <div class="field span-2">
            <div id="recordImagePreview" class="image-preview">${preview}</div>
          </div>
        </div>
      `,
    };
  }

  function buildVisitorModal(item) {
    const destinations = state.records.map((record) => `<option value="${record.id}" ${item && Number(item.tourism_record) === Number(record.id) ? 'selected' : ''}>${escapeHtml(record.name)}</option>`).join('');
    return {
      title: item ? 'Edit Visitor' : 'Add Visitor',
      subtitle: item ? 'Update guest visit details.' : 'Create a new guest entry.',
      body: `
        <div class="modal-grid">
          <div class="field">
            <label for="visitorName">Visitor Name</label>
            <input class="form-control" id="visitorName" name="name" type="text" value="${escapeAttribute(item ? item.name : '')}" required>
          </div>
          <div class="field">
            <label for="visitorOrigin">Origin</label>
            <input class="form-control" id="visitorOrigin" name="origin" type="text" value="${escapeAttribute(item ? item.origin : '')}" required>
          </div>
          <div class="field">
            <label for="visitorDestination">Destination Record</label>
            <select class="form-control" id="visitorDestination" name="tourism_record">
              <option value="">Select destination</option>
              ${destinations}
            </select>
          </div>
          <div class="field">
            <label for="visitorPlace">Destination Name</label>
            <input class="form-control" id="visitorPlace" name="place" type="text" value="${escapeAttribute(item ? item.place : '')}" required>
          </div>
          <div class="field">
            <label for="visitorDate">Visit Date & Time</label>
            <input class="form-control" id="visitorDate" name="visit_date" type="datetime-local" value="${escapeAttribute(item ? toLocalInputValue(item.visit_date) : '')}" required>
          </div>
          <div class="field">
            <label for="visitorStatus">Status</label>
            <select class="form-control" id="visitorStatus" name="status">
              <option value="Checked In" ${!item || item.status === 'Checked In' ? 'selected' : ''}>Checked In</option>
              <option value="Checked Out" ${item && item.status === 'Checked Out' ? 'selected' : ''}>Checked Out</option>
            </select>
          </div>
        </div>
      `,
    };
  }

  function buildUserModal(item) {
    const roles = ['Super Admin', 'Reviewer', 'Viewer', 'User'];
    const statuses = ['Pending Approval', 'Active', 'Inactive'];
    const selectedOffice = item ? item.office : '';
    const establishmentOptionsMarkup = buildEstablishmentOptionsMarkup(selectedOffice);
    return {
      title: item ? 'Edit User' : 'Add User',
      subtitle: item ? 'Update account access and role.' : 'Create a new user account.',
      body: `
        <div class="modal-grid">
          <div class="field">
            <label for="userName">Full Name</label>
            <input class="form-control" id="userName" name="name" type="text" value="${escapeAttribute(item ? item.name : '')}" required>
          </div>
          <div class="field">
            <label for="userUsername">Username</label>
            <input class="form-control" id="userUsername" name="username" type="text" value="${escapeAttribute(item ? item.username : '')}" required>
          </div>
          <div class="field">
            <label for="userEmail">Email</label>
            <input class="form-control" id="userEmail" name="email" type="email" value="${escapeAttribute(item ? item.email : '')}" required>
          </div>
          <div class="field">
            <label for="userOffice">Establishment</label>
            <input class="form-control" id="userOffice" name="office" list="userOfficeOptions" type="text" value="${escapeAttribute(selectedOffice)}" placeholder="Select or type establishment">
            <datalist id="userOfficeOptions">
              ${establishmentOptionsMarkup}
            </datalist>
          </div>
          <div class="field">
            <label for="userRole">Role</label>
            <select class="form-control" id="userRole" name="role">
              ${roles.map((role) => `<option value="${role}" ${item && item.role === role ? 'selected' : ''}>${role}</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <label for="userStatus">Status</label>
            <select class="form-control" id="userStatus" name="status">
              ${statuses.map((statusValue) => `<option value="${statusValue}" ${(!item && statusValue === 'Active') || (item && item.status === statusValue) ? 'selected' : ''}>${statusValue}</option>`).join('')}
            </select>
          </div>
          <div class="field span-2">
            <label for="userPassword">${item ? 'New Password (optional)' : 'Password'}</label>
            <input class="form-control" id="userPassword" name="password" type="password" ${item ? '' : 'required'} placeholder="${item ? 'Leave blank to keep current password' : 'Set an initial password'}">
          </div>
        </div>
      `,
    };
  }

  function buildProfileModal() {
    const user = state.user || {};
    const selectedOffice = user.office || '';
    const establishmentOptionsMarkup = buildEstablishmentOptionsMarkup(selectedOffice);
    const preview = user.profile_picture_url || user.profile_picture
      ? `<img src="${escapeAttribute(user.profile_picture_url || user.profile_picture)}" alt="${escapeAttribute(user.name || 'Profile picture')}">`
      : `<div><i class="fa-regular fa-user"></i><p>Add a profile picture.</p></div>`;
    return {
      title: 'Edit Profile',
      subtitle: 'Update your account details and profile picture.',
      saveText: '<i class="fa-solid fa-floppy-disk"></i>Save Profile',
      body: `
        <div class="modal-grid">
          <div class="field">
            <label for="profileName">Full Name</label>
            <input class="form-control" id="profileName" name="name" type="text" value="${escapeAttribute(user.name || '')}" required>
          </div>
          <div class="field">
            <label for="profileUsername">Username</label>
            <input class="form-control" id="profileUsername" name="username" type="text" value="${escapeAttribute(user.username || '')}" required>
          </div>
          <div class="field">
            <label for="profileOffice">Establishment</label>
            <input class="form-control" id="profileOffice" name="office" list="profileOfficeOptions" type="text" value="${escapeAttribute(selectedOffice)}" placeholder="Select or type establishment">
            <datalist id="profileOfficeOptions">
              ${establishmentOptionsMarkup}
            </datalist>
          </div>
          <div class="field">
            <label>Email</label>
            <input class="form-control" type="email" value="${escapeAttribute(user.email || '')}" disabled>
          </div>
          <div class="field span-2">
            <label for="profilePictureInput">Profile Picture</label>
            <input class="form-control" id="profilePictureInput" name="profile_picture" type="file" accept="image/*">
          </div>
          <div class="field span-2">
            <div id="profilePicturePreview" class="image-preview profile-picture-preview">${preview}</div>
          </div>
        </div>
      `,
    };
  }

  function buildDataRequestModal() {
    const targets = Array.isArray(state.dataRequestTargets) ? state.dataRequestTargets : [];
    const establishments = getActiveDataRequestEstablishments(targets);
    const establishmentOptions = establishments.length
      ? establishments.map((establishment) => `
          <option value="${escapeAttribute(establishment.name)}">
            ${escapeHtml(`${establishment.name} - ${establishment.count} active user${establishment.count === 1 ? '' : 's'}`)}
          </option>
        `).join('')
      : '<option value="" disabled>No active establishments available</option>';
    const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);

    return {
      title: 'Request Data',
      subtitle: 'Notify users that admin needs a data file from them.',
      saveText: '<i class="fa-solid fa-paper-plane"></i>Send Request',
      body: `
        <div class="modal-grid">
          <div class="field span-2">
            <label for="dataRequestEstablishments">Recipients</label>
            <select class="form-control recipient-select" id="dataRequestEstablishments" name="establishments" multiple size="6" ${establishments.length ? '' : 'disabled'}>
              ${establishmentOptions}
            </select>
            <input type="hidden" name="recipient_scope" value="establishment">
          </div>
          <div class="field span-2">
            <label for="dataRequestTitle">Request title</label>
            <input class="form-control" id="dataRequestTitle" name="title" type="text" value="Data request from admin" maxlength="120" required>
          </div>
          <div class="field">
            <label for="dataRequestDueDate">Due date</label>
            <input class="form-control" id="dataRequestDueDate" name="due_date" type="date" min="${today}">
          </div>
          <div class="field span-2">
            <label for="dataRequestMessage">Data needed</label>
            <textarea class="form-control" id="dataRequestMessage" name="message" maxlength="1000" placeholder="Example: Please submit the April visitor arrivals file for review." required></textarea>
          </div>
        </div>
      `,
    };
  }

  function getActiveDataRequestEstablishments(targets = state.dataRequestTargets) {
    const grouped = new Map();
    (Array.isArray(targets) ? targets : []).forEach((target) => {
      const establishmentName = String(target.office || '').trim();
      if (!establishmentName) {
        return;
      }
      if (!grouped.has(establishmentName)) {
        grouped.set(establishmentName, []);
      }
      grouped.get(establishmentName).push(target);
    });

    return Array.from(grouped.entries())
      .map(([name, users]) => ({
        name,
        count: users.length,
      }))
      .sort((left, right) => left.name.localeCompare(right.name, undefined, { sensitivity: 'base' }));
  }

  function bindDataRequestModalControls() {
    const establishmentsSelect = document.getElementById('dataRequestEstablishments');
    if (establishmentsSelect) {
      establishmentsSelect.disabled = !getActiveDataRequestEstablishments().length;
    }
  }

  function buildEstablishmentOptionsMarkup(selectedValue) {
    const normalizedValue = String(selectedValue || '').trim();
    return getKnownEstablishmentOptions(normalizedValue)
      .map((option) => `<option value="${escapeAttribute(option)}"></option>`)
      .join('');
  }

  function getKnownEstablishmentOptions(extraValue = '') {
    const options = new Set();
    const addOption = (value) => {
      const normalized = String(value || '').trim();
      if (normalized) {
        options.add(normalized);
      }
    };
    establishmentOptions.forEach(addOption);
    state.users.forEach((user) => addOption(user.office));
    state.dataRequestTargets.forEach((target) => addOption(target.office));
    addOption(extraValue);
    return Array.from(options).sort((left, right) => left.localeCompare(right, undefined, { sensitivity: 'base' }));
  }

  function handleRecordImagePreview(event) {
    const file = event.target.files && event.target.files[0];
    const preview = document.getElementById('recordImagePreview');
    if (!preview || !file) return;

    const reader = new FileReader();
    reader.onload = () => {
      preview.innerHTML = `<img src="${reader.result}" alt="Selected preview">`;
    };
    reader.readAsDataURL(file);
  }

  function handleProfilePicturePreview(event) {
    const file = event.target.files && event.target.files[0];
    const preview = document.getElementById('profilePicturePreview');
    if (!preview || !file) return;

    const reader = new FileReader();
    reader.onload = () => {
      preview.innerHTML = `<img src="${reader.result}" alt="Selected profile preview">`;
    };
    reader.readAsDataURL(file);
  }

  function syncVisitorPlaceFromSelect(event) {
    const selectedId = Number(event.target.value);
    const selectedRecord = state.records.find((record) => Number(record.id) === selectedId);
    const placeInput = document.getElementById('visitorPlace');
    if (selectedRecord && placeInput) {
      placeInput.value = selectedRecord.name;
    }
  }

  async function handleEntitySubmit(event) {
    event.preventDefault();
    const entity = dom.entityForm.dataset.entity;
    const itemId = dom.entityForm.dataset.id;
    const isEditing = !!itemId;
    dom.saveModalBtn.disabled = true;

    try {
      if (entity === 'record') {
        if (!canEditData()) {
          throw new Error('Only Super Admins and Reviewers can edit tourism records.');
        }
        const formData = new FormData(dom.entityForm);
        const file = formData.get('image_path');
        if (!(file && file.name)) {
          formData.delete('image_path');
        }
        await apiRequest(isEditing ? `/records/${itemId}/` : '/records/', {
          method: isEditing ? 'PATCH' : 'POST',
          body: formData,
        });
        showToast(isEditing ? 'Record updated' : 'Record added', 'Tourism record saved successfully.');
      }

      if (entity === 'visitor') {
        if (!canEditData()) {
          throw new Error('Only Super Admins and Reviewers can edit visitor entries.');
        }
        const formData = new FormData(dom.entityForm);
        const localDateTime = formData.get('visit_date');
        const payload = {
          name: String(formData.get('name') || '').trim(),
          origin: String(formData.get('origin') || '').trim(),
          place: String(formData.get('place') || '').trim(),
          visit_date: localDateTime ? new Date(localDateTime).toISOString() : null,
          status: formData.get('status'),
          tourism_record: formData.get('tourism_record') ? Number(formData.get('tourism_record')) : null,
        };
        await apiRequest(isEditing ? `/visitors/${itemId}/` : '/visitors/', {
          method: isEditing ? 'PATCH' : 'POST',
          body: JSON.stringify(payload),
        });
        showToast(isEditing ? 'Visitor updated' : 'Visitor added', 'Visitor entry saved successfully.');
      }

      if (entity === 'user') {
        if (!canManageUsers()) {
          throw new Error('Only Super Admins can manage user accounts.');
        }
        const formData = new FormData(dom.entityForm);
        const payload = {
          name: String(formData.get('name') || '').trim(),
          username: String(formData.get('username') || '').trim(),
          email: String(formData.get('email') || '').trim(),
          office: String(formData.get('office') || '').trim(),
          role: formData.get('role'),
          status: formData.get('status'),
        };
        const password = String(formData.get('password') || '').trim();
        if (password) {
          payload.password = password;
        }
        await apiRequest(isEditing ? `/users/${itemId}/` : '/users/', {
          method: isEditing ? 'PATCH' : 'POST',
          body: JSON.stringify(payload),
        });
        showToast(isEditing ? 'User updated' : 'User added', 'User account saved successfully.');
      }

      if (entity === 'profile') {
        const formData = new FormData(dom.entityForm);
        const file = formData.get('profile_picture');
        if (!(file && file.name)) {
          formData.delete('profile_picture');
        }
        const updatedUser = await apiRequest('/auth/me/', {
          method: 'PATCH',
          body: formData,
        });
        state.user = updatedUser;
        updatePersistedUser(updatedUser);
        state.users = state.users.map((user) => (Number(user.id) === Number(updatedUser.id) ? updatedUser : user));
        updateUiForRole();
        showToast('Profile updated', 'Your account profile was saved successfully.');
      }

      if (entity === 'data-request') {
        if (!canApproveSubmissions()) {
          throw new Error('Only Super Admins and Reviewers can request data from users.');
        }
        const formData = new FormData(dom.entityForm);
        const recipientScope = String(formData.get('recipient_scope') || 'selected').trim();
        const establishmentsSelect = document.getElementById('dataRequestEstablishments');
        const selectedEstablishments = Array.from(establishmentsSelect?.selectedOptions || [])
          .map((option) => String(option.value || '').trim())
          .filter(Boolean);
        const recipientsSelect = document.getElementById('dataRequestRecipients');
        const recipientIds = Array.from(recipientsSelect?.selectedOptions || [])
          .map((option) => Number(option.value))
          .filter((value) => Number.isInteger(value) && value > 0);
        if (recipientScope === 'establishment' && !selectedEstablishments.length) {
          throw new Error('Choose at least one establishment to notify.');
        }
        if (recipientScope === 'selected' && !recipientIds.length) {
          throw new Error('Choose at least one user to notify.');
        }
        const payload = {
          recipient_scope: recipientScope,
          establishments: selectedEstablishments,
          recipient_ids: recipientIds,
          title: String(formData.get('title') || '').trim(),
          message: String(formData.get('message') || '').trim(),
          due_date: String(formData.get('due_date') || '').trim(),
        };
        const result = await apiRequest('/data-requests/', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        showToast('Data request sent', result.detail || `Notified ${result.created_count || recipientIds.length} user(s).`);
      }

      closeModal();
      await refreshAllData();
    } catch (error) {
      showToast('Save failed', extractErrorMessage(error), 'fa-solid fa-triangle-exclamation');
    } finally {
      dom.saveModalBtn.disabled = false;
    }
  }

  function confirmClearLogs() {
    if (!canManageRecycle()) {
      showToast('Access denied', 'Only Super Admins can clear logs.', 'fa-solid fa-lock');
      return;
    }
    openConfirm({
      title: 'Clear activity logs',
      subtitle: 'This removes all existing log entries.',
      content: '<p>Are you sure you want to clear all activity logs?</p>',
      confirmText: 'Clear',
      onConfirm: async () => {
        try {
          await apiRequest('/activity-logs/clear/', { method: 'DELETE' });
          closeConfirm();
          showToast('Logs cleared', 'All activity logs were removed.');
          await refreshAllData();
        } catch (error) {
          showToast('Clear failed', error.message, 'fa-solid fa-triangle-exclamation');
        }
      },
    });
  }

  function confirmEmptyRecycleBin() {
    if (!canManageRecycle()) {
      showToast('Access denied', 'Only Super Admins can empty the recycle bin.', 'fa-solid fa-lock');
      return;
    }
    openConfirm({
      title: 'Empty recycle bin',
      subtitle: 'This permanently deletes all recoverable items.',
      content: '<p>Are you sure you want to empty the recycle bin?</p>',
      confirmText: 'Empty bin',
      onConfirm: async () => {
        try {
          await apiRequest('/recycle-bin/empty/', { method: 'DELETE' });
          closeConfirm();
          showToast('Recycle bin emptied', 'All deleted items were permanently removed.');
          await refreshAllData();
        } catch (error) {
          showToast('Empty failed', error.message, 'fa-solid fa-triangle-exclamation');
        }
      },
    });
  }

  async function downloadAuthenticatedFile(path, filename) {
    if (!state.token) {
      return false;
    }
    try {
      const response = await fetch(`${getApiBase()}${path}`, {
        headers: {
          Authorization: `Token ${state.token}`,
        },
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.detail || 'Unable to download file.');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      showToast('Download ready', `${filename} has been downloaded.`);
      return true;
    } catch (error) {
      showToast('Download failed', error.message, 'fa-solid fa-triangle-exclamation');
      return false;
    }
  }

  function showToast(title, message, icon = 'fa-solid fa-circle-check') {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
      <i class="${icon}"></i>
      <div>
        <strong>${escapeHtml(title)}</strong>
        <p>${escapeHtml(message)}</p>
      </div>
    `;
    dom.toastWrap.appendChild(toast);
    setTimeout(() => {
      toast.remove();
    }, 4000);
  }

  function buildEmptyState(message) {
    return `
      <div class="empty-state">
        <i class="fa-regular fa-folder-open"></i>
        <p>${escapeHtml(message)}</p>
      </div>
    `;
  }

  function buildSendDataEmptyState(title, message) {
    return `
      <div class="send-data-empty-state">
        <div class="send-data-empty-illustration" aria-hidden="true">
          <span class="send-data-empty-glow"></span>
          <i class="fa-solid fa-file-excel send-data-empty-primary"></i>
          <i class="fa-solid fa-cloud-arrow-up send-data-empty-secondary"></i>
        </div>
        <strong>${escapeHtml(title)}</strong>
        <p>${escapeHtml(message)}</p>
      </div>
    `;
  }

  function buildEmptyTableRow(colspan, message) {
    return `<tr><td colspan="${colspan}">${buildEmptyState(message)}</td></tr>`;
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function escapeAttribute(value) {
    return escapeHtml(value).replace(/`/g, '&#96;');
  }

  function capitalize(value) {
    return String(value || '').charAt(0).toUpperCase() + String(value || '').slice(1);
  }

  function formatDateTime(value) {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleString([], {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  function formatFileSize(bytes) {
    const numericBytes = Number(bytes) || 0;
    if (numericBytes < 1024) {
      return `${numericBytes} B`;
    }
    if (numericBytes < 1024 * 1024) {
      return `${(numericBytes / 1024).toFixed(1)} KB`;
    }
    return `${(numericBytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function formatCompactNumber(value) {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) {
      return '0';
    }
    return numericValue.toLocaleString();
  }

  function toLocalInputValue(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const offset = date.getTimezoneOffset();
    const local = new Date(date.getTime() - offset * 60000);
    return local.toISOString().slice(0, 16);
  }

  function timeAgo(value) {
    if (!value) return 'now';
    const date = new Date(value);
    const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  function timeAgoLong(value) {
    if (!value) return 'just now';
    const date = new Date(value);
    const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
    if (seconds < 10) return 'just now';
    if (seconds < 60) return `${seconds} sec ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min${minutes === 1 ? '' : 's'} ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days === 1 ? '' : 's'} ago`;
  }

  function isRecentTimestamp(value, recentWindowHours = 24) {
    if (!value) {
      return false;
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return false;
    }
    return Date.now() - date.getTime() <= recentWindowHours * 60 * 60 * 1000;
  }

  function extractErrorMessage(error) {
    if (!error) return 'An unknown error occurred.';
    if (error.payload) {
      const payload = error.payload;
      if (typeof payload.detail === 'string') {
        return payload.detail;
      }
      const firstField = Object.keys(payload)[0];
      if (firstField) {
        const fieldValue = payload[firstField];
        if (Array.isArray(fieldValue)) {
          return fieldValue.join(' ');
        }
        if (typeof fieldValue === 'string') {
          return fieldValue;
        }
      }
    }
    return error.message || 'An unknown error occurred.';
  }

  function readItemName(itemData) {
    if (!itemData) return '';
    return itemData.name || itemData.username || itemData.email || itemData.place || '';
  }

  function readJsonScript(id) {
    const element = document.getElementById(id);
    if (!element) {
      return [];
    }
    try {
      return JSON.parse(element.textContent);
    } catch (error) {
      return [];
    }
  }
})();

