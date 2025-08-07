let theWheel;
let wheelSpinning = false;
let isPlaying = false;

const COLORS = ['#FF4444', '#44FF44', '#4444FF', '#FFFF44', '#FF44FF', '#44FFFF',
    '#FFA500', '#98FB98', '#DDA0DD', '#F0E68C', '#800080', '#008080'];

const tickAudio = document.getElementById('tickAudio');
const winAudio = document.getElementById('winAudio');

const swalConfig = {
    background: 'transparent',
    backdrop: `
        rgba(0,0,0,0.7)
        url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='49' viewBox='0 0 28 49'%3E%3Cg fill='%239333ea' fill-opacity='0.1'%3E%3Cpath d='M13.99 9.25l13 7.5v15l-13 7.5L1 31.75v-15l12.99-7.5zM3 17.9v12.7l10.99 6.34 11-6.35V17.9l-11-6.34L3 17.9z'/%3E%3C/g%3E%3C/svg%3E")
    `,
    customClass: {
        popup: 'cyber-alert',
        title: 'cyber-title',
        confirmButton: 'cyber-button',
        cancelButton: 'cyber-button'
    },
    showClass: {
        popup: 'animate__animated animate__fadeInDown'
    },
    hideClass: {
        popup: 'animate__animated animate__fadeOutUp'
    }
};

async function initWheel() {
    try {
        const response = await fetch('/prizes');
        const prizes = await response.json();

        const segments = prizes.map((prize, index) => ({
            fillStyle: prize.color || COLORS[index % COLORS.length],
            text: prize.name,
            textFontSize: 16,
            description: prize.description,
            image: prize.image_url,
            textFillStyle: '#FFFFFF',
            segmentId: prize.id,
            textAlignment: 'inner',
            textMargin: 20
        }));
        theWheel = new Winwheel({
            canvasId: 'spinWheel',
            numSegments: segments.length,
            outerRadius: 212,
            innerRadius: 65,
            strokeStyle: '#FFD700',
            shadowColor: 'gold',
            textAlignment: 'inner',
            pointerAngle: 0,
            textFontSize: 18,
            textMargin: 20,
            lineWidth: 2,
            segments: segments,
            pins: {
                responsive: true,
                outerRadius: 8,
                margin: 10,
                fillStyle: '#4c1d95',
                strokeStyle: '#000000',
                number: segments.length * 4
            },
            animation: {
                type: 'spinToStop',
                duration: 100,
                spins: segments.length * 3 + Math.floor(Math.random() * segments.length),
                callbackFinished: alertPrize,
                callbackSound: playTickSound,
                soundTrigger: 'pin'
            }
        });
        const canvas = document.getElementById('spinWheel');
        const ctx = canvas.getContext('2d');
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const outerRadius = theWheel.outerRadius;

        theWheel.draw();
        ctx.save();
        ctx.shadowColor = 'gold';
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(centerX, centerY, outerRadius + 10, 0, 2 * Math.PI);
        ctx.lineWidth = 10;
        ctx.strokeStyle = '#FFD700';
        ctx.stroke();
        ctx.restore();
    } catch (error) {
        console.error('Failed to initialize wheel:', error);
    }
}

function playTickSound() {
    if (!isPlaying) {
        tickAudio.currentTime = 0;
        tickAudio.play().catch(console.error);
        isPlaying = true;
        tickAudio.onended = () => isPlaying = false;
    }
}

function playWinSound() {
    if (!isPlaying) {
        winAudio.currentTime = 0;
        winAudio.play().catch(console.error);
        isPlaying = true;
        winAudio.onended = () => isPlaying = false;
    }
}

async function startSpin(targetPrizeId) {
    if (wheelSpinning) return;
    const canvas = document.getElementById('spinWheel');
    const ctx = canvas.getContext('2d');
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const outerRadius = theWheel.outerRadius;

    theWheel.stopAnimation(false);
    theWheel.rotationAngle = 0;
    theWheel.draw();

    ctx.save();
    ctx.shadowColor = 'gold';
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.arc(centerX, centerY, outerRadius + 10, 0, 2 * Math.PI);
    ctx.lineWidth = 10;
    ctx.strokeStyle = '#FFD700';
    ctx.stroke();
    ctx.restore();

    const targetSegment = theWheel.segments.find(seg => {
        if (!seg) return false;
        return seg.segmentId === parseInt(targetPrizeId);
    });

    if (!targetSegment) {
        console.error('Target segment not found:', targetPrizeId);
        return;
    }

    wheelSpinning = true;

    const stopAt = theWheel.getRandomForSegment(theWheel.segments.indexOf(targetSegment));

    theWheel.animation.stopAngle = stopAt;
    theWheel.animation.spins = 10 + Math.floor(Math.random() * 10);
    theWheel.animation.duration = 10;

    theWheel.startAnimation();
}

function alertPrize() {
    wheelSpinning = false;
    const winningSegment = theWheel.getIndicatedSegment();
    playWinSound();

    setTimeout(() => {
        Swal.fire({
            ...swalConfig,
            imageUrl: winningSegment.image,
            imageWidth: 100,
            imageHeight: 100,
            imageAlt: 'Custom image',
            title: `${winningSegment.text}!`,
            text: `${winningSegment.description}!`,
            confirmButtonText: 'Awesome!'
        });
    }, 500);
}

document.getElementById('spin-button').addEventListener('click', async () => {
    const token = document.getElementById('token').value;
    if (!token) {
        Swal.fire({
            ...swalConfig,
            icon: 'error',
            title: 'Error',
            text: 'Please enter a token'
        });
        return;
    }

    try {
        const response = await fetch('/verify-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token })
        });

        const data = await response.json();
        if (data.valid) {
            document.getElementById('spin-button').disabled = true;
            if (!data.prize) {
                throw new Error('No prize ID received from server');
            }
            await startSpin(data.prize);
            document.getElementById('spin-button').disabled = false;
        } else {
            Swal.fire({
                ...swalConfig,
                icon: 'error',
                title: 'Invalid Token',
                text: 'This token is invalid or has already been used'
            });
        }
    } catch (error) {
        console.error('Spin error:', error);
        document.getElementById('spin-button').disabled = false;
        Swal.fire({
            ...swalConfig,
            icon: 'error',
            title: 'Error',
            text: 'Something went wrong. Please try again.'
        });
    }
});

document.addEventListener('DOMContentLoaded', initWheel);
