
// Mobile tab functionality
function initMobileTabs() {
    const mobileTabs = document.querySelector('.mobile-tabs');
    const leftSidebar = document.querySelector('.left-sidebar');
    const rightSidebar = document.querySelector('.right-sidebar');

    // Show mobile tabs on mobile devices
    if (window.innerWidth <= 968) {
        if (mobileTabs) mobileTabs.style.display = 'flex';
    }

    // Tab click handlers
    document.querySelectorAll('.mobile-tab').forEach(tab => {
        tab.lastEventListener = tab.lastEventListener || [];
        // Remove existing listeners to prevent duplicates
        const newTab = tab.cloneNode(true);
        tab.parentNode.replaceChild(newTab, tab);

        newTab.addEventListener('click', () => {
            const tabName = newTab.dataset.tab;

            // Update active tab UI
            document.querySelectorAll('.mobile-tab').forEach(t => t.classList.remove('active'));
            newTab.classList.add('active');

            // Show/hide sections
            if (tabName === 'player') {
                if (leftSidebar) leftSidebar.classList.remove('active');
                if (rightSidebar) rightSidebar.classList.remove('active');
            } else if (tabName === 'users') {
                if (leftSidebar) leftSidebar.classList.add('active');
                if (rightSidebar) rightSidebar.classList.remove('active');
            } else if (tabName === 'chat') {
                if (leftSidebar) leftSidebar.classList.remove('active');
                if (rightSidebar) rightSidebar.classList.add('active');
            }
        });
    });
}

// Handle window resize
window.addEventListener('resize', () => {
    const mobileTabs = document.querySelector('.mobile-tabs');
    if (window.innerWidth <= 968) {
        if (mobileTabs) mobileTabs.style.display = 'flex';
        initMobileTabs();
    } else {
        if (mobileTabs) mobileTabs.style.display = 'none';
        // Reset sidebars
        document.querySelectorAll('.sidebar').forEach(s => s.classList.remove('active'));
    }
});

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    initMobileTabs();
});
