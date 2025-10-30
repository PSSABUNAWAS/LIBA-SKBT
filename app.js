// LIBA v2.3 Official
// Rakaman, transkrip, TP BM/BI berasingan, kuiz MCQ berasingan, eksport CSV
let mediaRecorder = null;
let recordedChunks = [];
let recordingUrl = null;
let videoStream = null;
let recognition = null;
let recognizing = false;
let startTime = null;
let currentLang = "bm";
let bmTP = null;
let biTP = null;
let currentTranscript = "";

const $ = (sel) => document.querySelector(sel);

function nowDateTime(){
  const d = new Date();
  const tarikh = d.toISOString().slice(0,10);
  const masa = d.toTimeString().slice(0,8);
  return {tarikh, masa};
}

function wordCount(text){
  if(!text) return 0;
  const m = text.match(/\b[\p{L}\p{N}’']+\b/gu);
  return m ? m.length : 0;
}
function getDurationSeconds(){
  if(!startTime) return 0;
  return Math.floor((Date.now() - startTime) / 1000);
}
function computeWPM(text, seconds){
  if(seconds <= 0) return 0;
  const wc = wordCount(text);
  return Math.round((wc / seconds) * 60);
}
function computePercentFromWPM(wpm){
  // anggap 100 wpm = 100%
  let pct = Math.round(Math.min(100, (wpm / 100) * 100));
  if(pct < 0) pct = 0;
  return pct;
}
function mapPercentToTP(pct, lang="bm"){
  const ref = lang === "bm" ? bmTP : biTP;
  if(!ref) return {tp:"-", desc:"Data TP belum dimuatkan."};
  // cari rentang
  for(const row of ref){
    if(pct >= row.min && pct <= row.max){
      return {tp: row.tp, desc: row.desc};
    }
  }
  return {tp:"-", desc:"Tiada padanan TP."};
}

async function loadTP(){
  try{
    const bmRes = await fetch("modules/bm_tp.json");
    bmTP = await bmRes.json();
    const biRes = await fetch("modules/bi_tp.json");
    biTP = await biRes.json();
  }catch(e){
    console.error("Gagal muat TP:", e);
  }
}

function switchScreen(lang){
  currentLang = lang;
  $("#lang-screen").classList.remove("active-screen");
  $("#liba-screen").classList.add("active-screen");
  $("#bahasaAktif").value = lang === "bm" ? "Bahasa Melayu" : "English";
}

function initSpeech(langCode){
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SpeechRecognition) return null;
  const recog = new SpeechRecognition();
  recog.lang = langCode;
  recog.continuous = true;
  recog.interimResults = true;
  recog.onresult = (event) => {
    let finalTranscript = "";
    for(let i=event.resultIndex; i<event.results.length; i++){
      const res = event.results[i];
      if(res.isFinal){
        finalTranscript += res[0].transcript + " ";
      }else{
        finalTranscript += res[0].transcript + " ";
      }
    }
    currentTranscript += finalTranscript;
    $("#transkrip").value = currentTranscript.trim();
  };
  recog.onerror = (e) => console.error("Speech error", e);
  return recog;
}

async function startRecording(){
  recordedChunks = [];
  $("#btnStart").disabled = true;
  $("#btnStop").disabled = false;
  startTime = Date.now();
  // audio
  const audioStream = await navigator.mediaDevices.getUserMedia({audio:true});
  mediaRecorder = new MediaRecorder(audioStream);
  mediaRecorder.ondataavailable = (e) => {
    if(e.data.size > 0) recordedChunks.push(e.data);
  };
  mediaRecorder.onstop = () => {
    const blob = new Blob(recordedChunks, {type: "audio/webm"});
    recordingUrl = URL.createObjectURL(blob);
    $("#btnDownloadAudio").disabled = false;
  };
  mediaRecorder.start();

  // speech
  const langCode = currentLang === "bm" ? "ms-MY" : "en-US";
  recognition = initSpeech(langCode);
  if(recognition){
    recognition.start();
    recognizing = true;
  }
}

function stopRecording(){
  $("#btnStart").disabled = false;
  $("#btnStop").disabled = true;
  if(mediaRecorder && mediaRecorder.state !== "inactive"){
    mediaRecorder.stop();
  }
  if(recognition && recognizing){
    recognition.stop();
    recognizing = false;
  }
  // kira analisis
  const seconds = getDurationSeconds();
  const text = $("#transkrip").value.trim();
  const wpm = computeWPM(text, seconds);
  const pct = computePercentFromWPM(wpm);
  const {tp, desc} = mapPercentToTP(pct, currentLang);
  $("#peratusBaca").textContent = pct + "%";
  $("#tpBaca").textContent = tp;
  $("#tpExplanation").textContent = desc;
  addToRekod(seconds, wpm, pct, tp);
  computeFinalTP();
}

function addToRekod(seconds, wpm, pct, tp){
  const {tarikh, masa} = nowDateTime();
  const nama = $("#namaMurid").value || "-";
  const kelas = $("#kelasMurid").value || "-";
  const tbody = $("#rekodTable tbody");
  const tr = document.createElement("tr");
  tr.innerHTML = `<td>${tarikh}</td><td>${masa}</td><td>${nama}</td><td>${kelas}</td><td>${seconds}</td><td>${wpm}</td><td>${pct}%</td><td>${tp}</td><td>${$("#markahKuiz").textContent || "-"}</td>`;
  tbody.prepend(tr);
}

async function startCamera(){
  try{
    videoStream = await navigator.mediaDevices.getUserMedia({video:true});
    const vid = $("#videoPreview");
    vid.srcObject = videoStream;
    $("#btnStopCamera").disabled = false;
  }catch(e){
    alert("Kamera tidak dapat diakses.");
  }
}
function stopCamera(){
  if(videoStream){
    videoStream.getTracks().forEach(t => t.stop());
    $("#videoPreview").srcObject = null;
    $("#btnStopCamera").disabled = true;
  }
}

// Download audio/video
function downloadAudio(){
  if(!recordingUrl) return;
  const a = document.createElement("a");
  a.href = recordingUrl;
  a.download = "rakaman_liba_audio.webm";
  a.click();
}
// For simplicity: download video = same audio if no camera recording
function downloadVideo(){
  const canvasBlob = new Blob(recordedChunks, {type:"video/webm"});
  const url = URL.createObjectURL(canvasBlob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "rakaman_liba_video.webm";
  a.click();
}

// Kuiz MCQ
const sampleQuestions = [
  {q:"Apakah tujuan utama membaca petikan?",opts:["Untuk faham isi","Untuk tidur","Untuk bermain","Untuk buang masa"],a:0},
  {q:"Apakah yang perlu dibuat sebelum membaca?",opts:["Kenal pasti tajuk","Tutup buku","Padam teks","Baring"],a:0},
  {q:"Selepas membaca, kita perlu ...",opts:["Ulang sebutan","Lari","Padam rakaman","Keluar kelas"],a:0},
  {q:"Apakah bahan bacaan yang sesuai di PSS?",opts:["Buku cerita","Pinggan","Kasut","Pensel"],a:0},
  {q:"Siapakah guru yang memantau bacaan?",opts:["Guru BM","Doktor","Pemandu","Chef"],a:0},
  {q:"Apakah makna literasi?",opts:["Keupayaan membaca dan menulis","Menari","Melompat","Menyanyi"],a:0},
  {q:"Apakah manfaat membaca kuat?",opts:["Perbaiki sebutan","Lapar","Haus","Mengantuk"],a:0},
  {q:"Di mana rakaman bacaan disimpan?",opts:["Dalam sistem LIBA","Dalam peti ais","Dalam almari kasut","Dalam tong sampah"],a:0},
  {q:"Apakah tindakan jika suara tidak jelas?",opts:["Rakam semula","Padam app","Tutup sekolah","Buang buku"],a:0},
  {q:"Apakah maksud TP?",opts:["Tahap Penguasaan","Taman Permainan","Tiket Percuma","Tolak Pekali"],a:0}
];

function shuffle(array){
  return array.map(v=>({v,sort:Math.random()})).sort((a,b)=>a.sort-b.sort).map(({v})=>v);
}

function generateQuiz(){
  const container = $("#quizContainer");
  container.innerHTML = "";
  const picked = shuffle(sampleQuestions).slice(0,10);
  picked.forEach((item,idx)=>{
    const div = document.createElement("div");
    div.className = "soalan";
    let html = `<p><strong>${idx+1}.</strong> ${item.q}</p>`;
    item.opts.forEach((opt,i)=>{
      html += `<label><input type="radio" name="q${idx}" value="${i}"> ${opt}</label><br>`;
    });
    div.innerHTML = html;
    container.appendChild(div);
  });
  $("#btnSemakKuiz").disabled = false;
  // simpan senarai kuiz di dataset
  $("#quizContainer").dataset.quiz = JSON.stringify(picked);
}

function markQuiz(){
  const container = $("#quizContainer");
  const data = container.dataset.quiz;
  if(!data) return;
  const quiz = JSON.parse(data);
  let betul = 0;
  quiz.forEach((item,idx)=>{
    const sel = document.querySelector(`input[name="q${idx}"]:checked`);
    if(sel && Number(sel.value) === item.a){
      betul++;
    }
  });
  const markah = Math.round((betul / quiz.length) * 100);
  $("#markahKuiz").textContent = markah + "%";
  // TP kuiz
  let tpKuiz = "-";
  if(markah >= 95) tpKuiz = "TP6";
  else if(markah >= 80) tpKuiz = "TP5";
  else if(markah >= 60) tpKuiz = "TP4";
  else if(markah >= 40) tpKuiz = "TP3";
  else if(markah >= 20) tpKuiz = "TP2";
  else tpKuiz = "TP1";
  $("#tpKuiz").textContent = tpKuiz;
  computeFinalTP();
}

function computeFinalTP(){
  const bacaStr = $("#peratusBaca").textContent.replace("%","");
  const kuizStr = $("#markahKuiz").textContent.replace("%","");
  const baca = Number(bacaStr) || 0;
  const kuiz = Number(kuizStr) || 0;
  const finalPct = Math.round((baca + kuiz) / 2);
  const {tp} = mapPercentToTP(finalPct, currentLang);
  $("#tpAkhir").textContent = tp;
}

// Cetak laporan ringkas
function printReport(){
  const w = window.open("", "_blank");
  const html = `
    <html><head><title>Laporan LIBA</title></head><body>
    <h2>Laporan LIBA v2.3</h2>
    <p>Nama: ${$("#namaMurid").value || "-"}</p>
    <p>Kelas: ${$("#kelasMurid").value || "-"}</p>
    <p>Bahasa: ${$("#bahasaAktif").value || "-"}</p>
    <hr>
    <p>Peratus Bacaan: ${$("#peratusBaca").textContent}</p>
    <p>TP Bacaan: ${$("#tpBaca").textContent}</p>
    <p>Penjelasan TP: ${$("#tpExplanation").textContent}</p>
    <p>Markah Kuiz: ${$("#markahKuiz").textContent}</p>
    <p>TP Kuiz: ${$("#tpKuiz").textContent}</p>
    <p>TP Akhir: ${$("#tpAkhir").textContent}</p>
    <hr>
    <p>Dicetak dari LIBA v2.3 Official.</p>
    </body></html>
  `;
  w.document.write(html);
  w.document.close();
  w.print();
}

// Eksport CSV
function exportCSV(){
  const rows = [["Tarikh","Masa","Nama","Kelas","Tempoh(s)","WPM","Peratus","TP","Markah Kuiz"]];
  document.querySelectorAll("#rekodTable tbody tr").forEach(tr=>{
    const cols = Array.from(tr.children).map(td=>td.textContent);
    rows.push(cols);
  });
  const csv = rows.map(r=>r.join(",")).join("\n");
  const blob = new Blob([csv], {type:"text/csv"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "rekod_bacaan_liba.csv";
  a.click();
}

document.addEventListener("DOMContentLoaded", async ()=>{
  await loadTP();
  // lang buttons
  document.querySelectorAll("[data-lang]").forEach(btn=>{
    btn.addEventListener("click", (e)=>{
      const lng = e.currentTarget.dataset.lang;
      switchScreen(lng);
    });
  });

  $("#btnStart").addEventListener("click", startRecording);
  $("#btnStop").addEventListener("click", stopRecording);
  $("#btnCamera").addEventListener("click", startCamera);
  $("#btnStopCamera").addEventListener("click", stopCamera);
  $("#btnDownloadAudio").addEventListener("click", downloadAudio);
  $("#btnDownloadVideo").addEventListener("click", downloadVideo);
  $("#btnJanaKuiz").addEventListener("click", generateQuiz);
  $("#btnSemakKuiz").addEventListener("click", markQuiz);
  $("#btnCetak").addEventListener("click", printReport);
  $("#btnEksport").addEventListener("click", exportCSV);

  if("serviceWorker" in navigator){
    navigator.serviceWorker.register("sw.js").catch(console.error);
  }
});
