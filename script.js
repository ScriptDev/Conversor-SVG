// Game state
const gameState = {
    level: 1,
    xp: 0,
    xpToNextLevel: 100,
    conversions: 0,
    achievements: {
        firstConversion: false,
        conversionStreak: false,
        formatMaster: false
    },
    usedFormats: new Set()
};

// DOM Elements
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const preview = document.getElementById('preview');
const downloadBtn = document.getElementById('download-btn');
const formatSelect = document.getElementById('format');
const qualityInput = document.getElementById('quality');
const scaleInput = document.getElementById('scale');
const progressBar = document.querySelector('.progress-bar');
const levelBadge = document.querySelector('.level-badge');
const levelText = document.querySelector('.level-text');
const notification = document.getElementById('notification');
const achievements = document.querySelectorAll('.achievement');
const loadingOverlays = document.querySelectorAll('.loading-overlay');
const magicParticles = document.getElementById('magic-particles');
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const svgCodeTextarea = document.getElementById('svg-code');
const applyCodeBtn = document.getElementById('apply-code-btn');

// Current SVG data
let currentSvgData = null;
let convertedImageUrl = null;

// Event Listeners
dropZone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', handleFileSelect);
dropZone.addEventListener('dragover', handleDragOver);
dropZone.addEventListener('dragleave', handleDragLeave);
dropZone.addEventListener('drop', handleDrop);
downloadBtn.addEventListener('click', downloadImage);
formatSelect.addEventListener('change', convertSvgToImage);
qualityInput.addEventListener('change', convertSvgToImage);
scaleInput.addEventListener('change', convertSvgToImage);

// Tab navigation
tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));

        btn.classList.add('active');
        const tabName = btn.dataset.tab;
        document.getElementById(`${tabName}-tab`).classList.add('active');
    });
});

// Apply SVG code button
applyCodeBtn.addEventListener('click', handleSvgCode);

// Functions
function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.add('drag-over');
}

function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove('drag-over');

    if (e.dataTransfer.files.length) {
        const file = e.dataTransfer.files[0];
        if (file.type === "image/svg+xml" || file.name.endsWith('.svg')) {
            processFile(file);
        } else {
            showNotification('Only SVG files are supported!', 'error');
        }
    }
}

function handleFileSelect(e) {
    if (fileInput.files.length) {
        const file = fileInput.files[0];
        if (file.type === "image/svg+xml" || file.name.endsWith('.svg')) {
            processFile(file);
        } else {
            showNotification('Only SVG files are supported!', 'error');
        }
    }
}

function processFile(file) {
    showLoading(true);

    const reader = new FileReader();
    reader.onload = function(e) {
        currentSvgData = e.target.result;
        convertSvgToImage();

        // Create particle effect for upload
        createParticleEffect(dropZone);

        // Add XP
        addXP(10);
    };
    reader.onerror = function() {
        showLoading(false);
        showNotification('Error reading file!', 'error');
    };
    reader.readAsDataURL(file);
}

function handleSvgCode() {
    const svgCode = svgCodeTextarea.value.trim();

    if (!svgCode) {
        showNotification('Please enter SVG code!', 'error');
        return;
    }

    if (!svgCode.startsWith('<svg') || !svgCode.endsWith('</svg>')) {
        showNotification('Invalid SVG code format!', 'error');
        return;
    }

    showLoading(true);

    try {
        // Convert SVG code to data URL
        const blob = new Blob([svgCode], {type: 'image/svg+xml'});
        const reader = new FileReader();

        reader.onload = function(e) {
            currentSvgData = e.target.result;
            convertSvgToImage();

            // Create particle effect
            createParticleEffect(document.getElementById('code-tab'));

            // Add XP
            addXP(15); // Extra XP for coding!
        };

        reader.onerror = function() {
            showLoading(false);
            showNotification('Error processing SVG code!', 'error');
        };

        reader.readAsDataURL(blob);
    } catch (error) {
        showLoading(false);
        showNotification('Error processing SVG code: ' + error.message, 'error');
    }
}

function convertSvgToImage() {
    if (!currentSvgData) return;

    showLoading(true);

    const format = formatSelect.value;
    const quality = parseFloat(qualityInput.value) / 100;
    const scale = parseFloat(scaleInput.value);

    // Add this format to used formats
    gameState.usedFormats.add(format);
    checkAchievements();

    // Create a new Image element
    const img = new Image();
    img.onload = function() {
        // Create canvas
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Set dimensions
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;

        // Draw image on canvas
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Convert canvas to image
        convertedImageUrl = canvas.toDataURL(`image/${format}`, quality);

        // Display the result
        preview.innerHTML = '';
        const resultImg = document.createElement('img');
        resultImg.src = convertedImageUrl;
        preview.appendChild(resultImg);

        // Enable download button
        downloadBtn.disabled = false;

        // Create particle effect for conversion
        createParticleEffect(preview);

        showLoading(false);

        // Record conversion
        gameState.conversions++;
        addXP(15);
        checkAchievements();
    };

    img.onerror = function() {
        showLoading(false);
        showNotification('Error converting SVG!', 'error');
    };

    img.src = currentSvgData;
}

function downloadImage() {
    if (!convertedImageUrl) return;

    const format = formatSelect.value;
    const link = document.createElement('a');
    link.href = convertedImageUrl;
    link.download = `converted-image.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Add XP
    addXP(25);

    // Create sparkle effect
    createParticleEffect(downloadBtn, 'sparkle');
}

function addXP(amount) {
    gameState.xp += amount;
    updateProgress();

    // Check for level up
    if (gameState.xp >= gameState.xpToNextLevel) {
        levelUp();
    }
}

function levelUp() {
    gameState.level++;
    gameState.xp = gameState.xp - gameState.xpToNextLevel;
    gameState.xpToNextLevel = Math.floor(gameState.xpToNextLevel * 1.5);

    // Update UI
    levelBadge.textContent = gameState.level;

    // Update level title
    const levelTitles = [
        "Novice Converter",
        "Apprentice Transformer",
        "Image Alchemist",
        "Vector Wizard",
        "Conversion Master"
    ];
    levelText.textContent = levelTitles[Math.min(gameState.level - 1, levelTitles.length - 1)];

    // Show notification
    showNotification(`Level up! You are now level ${gameState.level}!`);

    // Create massive particle effect
    createParticleEffect(document.querySelector('.container'), 'levelup');

    // Update progress bar
    updateProgress();
}

function updateProgress() {
    const percentage = (gameState.xp / gameState.xpToNextLevel) * 100;
    progressBar.style.width = `${percentage}%`;
}

function checkAchievements() {
    // First Conversion
    if (!gameState.achievements.firstConversion && gameState.conversions >= 1) {
        unlockAchievement('firstConversion', 'First Conversion');
    }

    // Conversion Streak
    if (!gameState.achievements.conversionStreak && gameState.conversions >= 5) {
        unlockAchievement('conversionStreak', 'Conversion Streak');
    }

    // Format Master
    if (!gameState.achievements.formatMaster && gameState.usedFormats.size >= 3) {
        unlockAchievement('formatMaster', 'Format Master');
    }
}

function unlockAchievement(achievementId, name) {
    gameState.achievements[achievementId] = true;

    // Update UI
    const achievement = Array.from(achievements).find(a => a.textContent.includes(name));
    if (achievement) {
        achievement.classList.remove('locked');
    }

    // Show notification
    showNotification(`Achievement unlocked: ${name}!`);

    // Add XP bonus
    addXP(50);
}

function showNotification(message, type = 'success') {
    notification.textContent = message;
    notification.className = 'notification show';

    if (type === 'error') {
        notification.style.backgroundColor = '#dc3545';
    } else {
        notification.style.backgroundColor = 'var(--success)';
    }

    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

function showLoading(show) {
    loadingOverlays.forEach(overlay => {
        if (show) {
            overlay.classList.add('active');
        } else {
            overlay.classList.remove('active');
        }
    });
}

function createParticleEffect(element, type = 'normal') {
    const rect = element.getBoundingClientRect();
    const containerRect = document.querySelector('.container').getBoundingClientRect();

    const x = rect.left + rect.width / 2 - containerRect.left;
    const y = rect.top + rect.height / 2 - containerRect.top;

    const particleCount = type === 'levelup' ? 100 : type === 'sparkle' ? 30 : 15;
    const colors = type === 'levelup'
        ? ['#FFD700', '#FFA500', '#FF4500', '#FF6347']
        : type === 'sparkle'
            ? ['#FFD700', '#FFFFFF', '#FFF8DC']
            : ['#4e54c8', '#8f94fb', '#ff7f50'];

    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';

        const size = type === 'levelup' ? Math.random() * 15 + 5 : Math.random() * 8 + 3;
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;

        particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        particle.style.left = `${x}px`;
        particle.style.top = `${y}px`;

        const angle = Math.random() * Math.PI * 2;
        const velocity = type === 'levelup' ? Math.random() * 10 + 5 : Math.random() * 5 + 2;
        const vx = Math.cos(angle) * velocity;
        const vy = Math.sin(angle) * velocity;

        magicParticles.appendChild(particle);

        const duration = type === 'levelup' ? 2000 : 1000;
        let elapsed = 0;
        const interval = 20;

        const animate = () => {
            if (elapsed >= duration) {
                if (particle.parentNode) {
                    particle.parentNode.removeChild(particle);
                }
                return;
            }

            elapsed += interval;
            const progress = elapsed / duration;

            const currentX = parseFloat(particle.style.left) + vx;
            const currentY = parseFloat(particle.style.top) + vy - (type === 'levelup' ? 2 : 1); // Add some upward drift

            particle.style.left = `${currentX}px`;
            particle.style.top = `${currentY}px`;
            particle.style.opacity = 1 - progress;

            requestAnimationFrame(animate);
        };

        requestAnimationFrame(animate);
    }
}

// Init
updateProgress();

// Tooltips
document.addEventListener('mousemove', (e) => {
    const target = e.target.closest('[data-tooltip]');
    if (target) {
        let tooltip = document.querySelector('.tooltip');
        if (!tooltip) {
            tooltip = document.createElement('div');
            tooltip.className = 'tooltip';
            document.body.appendChild(tooltip);
        }

        tooltip.textContent = target.dataset.tooltip;
        tooltip.style.left = `${e.pageX + 10}px`;
        tooltip.style.top = `${e.pageY + 10}px`;
        tooltip.style.opacity = 1;
    } else {
        const tooltip = document.querySelector('.tooltip');
        if (tooltip) {
            tooltip.style.opacity = 0;
        }
    }
});
