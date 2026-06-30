document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const btnStart = document.getElementById('btn-start');
    const btnLower = document.getElementById('btn-lower');
    const btnCorrect = document.getElementById('btn-correct');
    const btnHigher = document.getElementById('btn-higher');
    const btnRestartSuccess = document.getElementById('btn-restart-success');
    const btnRestartCheat = document.getElementById('btn-restart-cheat');

    const lblCurrentGuess = document.getElementById('lbl-current-guess');
    const lblAttemptCurr = document.getElementById('lbl-attempt-curr');
    const lblRangeMin = document.getElementById('lbl-range-min');
    const lblRangeMax = document.getElementById('lbl-range-max');
    const rangeFill = document.getElementById('range-fill');
    const historyList = document.getElementById('history-list');

    const lblFinalNumber = document.getElementById('lbl-final-number');
    const lblTotalAttempts = document.getElementById('lbl-total-attempts');
    const statAttempts = document.getElementById('stat-attempts');

    const lblCheatHigher = document.getElementById('lbl-cheat-higher');
    const lblCheatLower = document.getElementById('lbl-cheat-lower');

    // Confetti Setup
    const canvas = document.getElementById('confetti-canvas');
    const ctx = canvas.getContext('2d');
    let particles = [];
    let animationFrameId;

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resizeCanvas);

    class ConfettiParticle {
        constructor() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height - canvas.height;
            this.size = Math.random() * 8 + 6;
            this.speedX = Math.random() * 4 - 2;
            this.speedY = Math.random() * 5 + 4;
            this.color = `hsl(${Math.random() * 360}, 90%, 60%)`;
            this.rotation = Math.random() * 360;
            this.rotationSpeed = Math.random() * 4 - 2;
        }
        update() {
            this.x += this.speedX;
            this.y += this.speedY;
            this.rotation += this.rotationSpeed;
        }
        draw() {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate((this.rotation * Math.PI) / 180);
            ctx.fillStyle = this.color;
            ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
            ctx.restore();
        }
    }

    function startConfetti() {
        resizeCanvas();
        particles = [];
        for (let i = 0; i < 150; i++) {
            particles.push(new ConfettiParticle());
        }
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        animateConfetti();
    }

    function stopConfetti() {
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    function animateConfetti() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        let active = false;
        particles.forEach(p => {
            p.update();
            p.draw();
            if (p.y < canvas.height) {
                active = true;
            }
        });
        if (active) {
            animationFrameId = requestAnimationFrame(animateConfetti);
        }
    }

    // View Routing Helper
    function switchView(viewId) {
        const views = document.querySelectorAll('.view');
        const activeView = document.getElementById(viewId);
        
        // Find currently active view to fade out
        let currentActive = null;
        views.forEach(v => {
            if (v.classList.contains('active')) {
                currentActive = v;
            }
        });

        if (currentActive) {
            currentActive.style.opacity = '0';
            currentActive.style.transform = 'translateY(-15px)';
            
            setTimeout(() => {
                currentActive.classList.remove('active');
                currentActive.style.display = 'none';
                
                // Show new view
                showNewView(activeView);
            }, 350);
        } else {
            showNewView(activeView);
        }
    }

    function showNewView(viewElement) {
        viewElement.style.display = 'flex';
        // Force DOM reflow to trigger transition
        viewElement.offsetHeight;
        viewElement.classList.add('active');
        viewElement.style.opacity = '1';
        viewElement.style.transform = 'translateY(0)';
    }

    // Game Actions
    async function startGame() {
        stopConfetti();
        try {
            const response = await fetch('/api/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            if (!response.ok) throw new Error('Failed to start game');
            const data = await response.json();
            
            updateGameUI(data);
            switchView('view-game');
        } catch (error) {
            console.error('Error starting game:', error);
            alert('Could not start game. Is the Python backend server running?');
        }
    }

    async function submitFeedback(feedback) {
        try {
            const response = await fetch('/api/respond', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ feedback })
            });
            if (!response.ok) throw new Error('Failed to send feedback');
            const data = await response.json();

            if (data.cheat_detected) {
                // Determine limits for warning display
                // If the contradiction happened, it means low is higher than high.
                // In Python: session['low'] = current_guess + 1 or session['high'] = current_guess - 1
                // So the contradiction bounds will be shown
                lblCheatHigher.textContent = data.low - 1; // Since low was set to guess + 1
                lblCheatLower.textContent = data.high + 1; // Since high was set to guess - 1
                switchView('view-cheat');
            } else if (data.game_over) {
                lblFinalNumber.textContent = data.guess;
                lblTotalAttempts.textContent = data.attempts;
                statAttempts.textContent = data.attempts;
                switchView('view-success');
                startConfetti();
            } else {
                updateGameUI(data);
            }
        } catch (error) {
            console.error('Error submitting feedback:', error);
            alert('Something went wrong. Please try again.');
        }
    }

    function updateGameUI(data) {
        // Current guess and attempts
        lblCurrentGuess.textContent = data.guess;
        lblAttemptCurr.textContent = data.attempts;
        
        // Range bar setup
        const low = data.low;
        const high = data.high;
        
        lblRangeMin.textContent = low;
        lblRangeMax.textContent = high;
        
        // Calculate fill bar margins
        // Range filled is low to high
        const leftPercent = ((low - 1) / 99) * 100;
        const rightPercent = ((100 - high) / 99) * 100;
        
        rangeFill.style.left = `${leftPercent}%`;
        rangeFill.style.right = `${rightPercent}%`;

        // History logs
        historyList.innerHTML = '';
        data.history.forEach((guessVal, index) => {
            const item = document.createElement('div');
            item.className = 'history-item';
            
            // Highlight the latest guess
            if (index === data.history.length - 1) {
                item.classList.add('last');
                item.innerHTML = `<span>⚡</span> Guess #${index + 1}: <strong>${guessVal}</strong>`;
            } else {
                item.innerHTML = `Guess #${index + 1}: <strong>${guessVal}</strong>`;
            }
            historyList.appendChild(item);
        });
        
        // Auto scroll history to bottom
        historyList.scrollTop = historyList.scrollHeight;
    }

    // Event Listeners
    btnStart.addEventListener('click', startGame);
    btnLower.addEventListener('click', () => submitFeedback('lower'));
    btnCorrect.addEventListener('click', () => submitFeedback('correct'));
    btnHigher.addEventListener('click', () => submitFeedback('higher'));
    btnRestartSuccess.addEventListener('click', startGame);
    btnRestartCheat.addEventListener('click', startGame);
});
