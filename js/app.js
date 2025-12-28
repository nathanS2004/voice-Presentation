// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// --- DOM ELEMENTS ---
const micBtn = document.getElementById('mic-btn');
const fileInput = document.getElementById('file-upload');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const fullscreenBtn = document.getElementById('fullscreen-btn');
const pageCountSpan = document.getElementById('page-count');
const fileNameSpan = document.getElementById('file-name');
const placeholder = document.getElementById('placeholder-text');
const container = document.getElementById('presentation-container');

// --- STATE VARIABLES ---
let mediaStream = null;
let pdfDoc = null;
let pageNum = 1;
let pageRendering = false;
let pageNumPending = null;
let scale = 2.0; 
const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');

// --- MICROPHONE HANDLING ---
micBtn.addEventListener('click', async () => {
    if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
        mediaStream = null;
        micBtn.textContent = "🎤 Enable Mic";
        micBtn.classList.remove('mic-active');
        return;
    }
    try {
        mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        micBtn.textContent = "🎤 Mic On";
        micBtn.classList.add('mic-active');
        micBtn.classList.remove('mic-denied');
        console.log("Microphone is live.");
    } catch (err) {
        console.error("Mic Error:", err);
        micBtn.textContent = "🚫 Access Denied";
        micBtn.classList.add('mic-denied');
        alert("Microphone access was denied or not found.");
    }
});

// --- PDF HANDLING ---
fileInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    fileNameSpan.textContent = file.name;
    if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
        const fileReader = new FileReader();
        fileReader.onload = function() {
            const typedarray = new Uint8Array(this.result);
            loadPDF(typedarray);
        };
        fileReader.readAsArrayBuffer(file);
    } else if (file.name.endsWith(".pptx")) {
        alert("Please save your PPTX as PDF first.");
    }
});

async function loadPDF(data) {
    pdfDoc = await pdfjsLib.getDocument(data).promise;
    pageNum = 1;
    placeholder.style.display = 'none';
    container.appendChild(canvas);
    fullscreenBtn.disabled = false;
    updateButtons();
    renderPage(pageNum);
}

function renderPage(num) {
    pageRendering = true;
    pageCountSpan.textContent = `${num} / ${pdfDoc.numPages}`;
    pdfDoc.getPage(num).then(function(page) {
        const viewport = page.getViewport({scale: scale});
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        const renderContext = { canvasContext: ctx, viewport: viewport };
        page.render(renderContext).promise.then(function() {
            pageRendering = false;
            if (pageNumPending !== null) {
                renderPage(pageNumPending);
                pageNumPending = null;
            }
        });
    });
    updateButtons();
}

function queueRenderPage(num) {
    if (pageRendering) pageNumPending = num;
    else renderPage(num);
}

function onPrevPage() {
    if (pageNum <= 1) return;
    pageNum--;
    queueRenderPage(pageNum);
}

function onNextPage() {
    if (pageNum >= pdfDoc.numPages) return;
    pageNum++;
    queueRenderPage(pageNum);
}

function updateButtons() {
    prevBtn.disabled = pageNum <= 1;
    nextBtn.disabled = pageNum >= pdfDoc.numPages;
}

fullscreenBtn.addEventListener('click', () => {
    if (!document.fullscreenElement) container.requestFullscreen();
    else document.exitFullscreen();
});

prevBtn.addEventListener('click', onPrevPage);
nextBtn.addEventListener('click', onNextPage);
document.addEventListener('keydown', (e) => {
    if (!pdfDoc) return;
    if (e.key === "ArrowLeft") onPrevPage();
    if (e.key === "ArrowRight") onNextPage();
});
