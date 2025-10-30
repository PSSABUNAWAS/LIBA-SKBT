
function downloadBlob(blob, filename){
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(()=>{
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 500);
}

let transcriptText = '';
let recognition = null;
let recognizing = false;
let timerInterval = null;
let secondsElapsed = 0;
let stream = null;
const $ = (s) => document.querySelector(s);

function wordCount(s){ return (s.trim().match(/\b[\p{L}\p{N}’']+\b/gu) || []).length; }
function computeWPM(text, seconds){ if(seconds<=0)return 0; const wc=wordCount(text); return Math.round((wc/seconds)*60); }
function percentFromWPM(wpm){ return Math.round(Math.min(100,(wpm/100)*100)); }
function formatTime(s){ const m=Math.floor(s/60).toString().padStart(2,'0'); const ss=(s%60).toString().padStart(2,'0'); return `${m}:${ss}`; }
function startTimer(){ secondsElapsed=0; $('#masaRekod').textContent='00:00'; timerInterval=setInterval(()=>{ secondsElapsed++; $('#masaRekod').textContent=formatTime(secondsElapsed); const t=$('#transkrip').value; const w=computeWPM(t,secondsElapsed); $('#wpmRekod').textContent=w; $('#peratusRekod').textContent=percentFromWPM(w)+'%'; },1000); }
function stopTimer(){ if(timerInterval) clearInterval(timerInterval); timerInterval=null; }

const TP_STANDARDS = {
  "BI_T1": {
    1:{tajuk:"Level 1",nota:"Requires support to achieve curriculum target (Working towards A1)",deskripsi:["Hardly identifies and recognises shapes of the letters.","Hardly blends and segments phonemes."]},
    2:{tajuk:"Level 2",nota:"On track to achieve curriculum target (Working towards A1)",deskripsi:["Identifies most shapes with support.","Blends and segments a few phonemes.","Understands very simple phrases after repeated readings."]},
    3:{tajuk:"Level 3",nota:"Achieves expectations of curriculum target",deskripsi:["Identifies all shapes with support.","Blends and segments phonemes with support.","Understands main ideas and details of very simple phrases.","Uses picture dictionary with support."]},
    4:{tajuk:"Level 4",nota:"Working towards exceeding expectations (A1 Low)",deskripsi:["Blends and segments without hesitation.","Understands very simple sentences appropriately.","Uses picture dictionary with minimal support."]},
    5:{tajuk:"Level 5",nota:"On track to exceed expectations",deskripsi:["Uses phonics to read words confidently.","Understands very simple sentences confidently.","Uses picture dictionary confidently."]},
    6:{tajuk:"Level 6",nota:"Exceeds expectations",deskripsi:["Uses phonics to read words independently.","Understands simple sentences independently.","Uses picture dictionary independently."]}
  },
  "BI_T5": {
    1:{tajuk:"Level 1",nota:"Needs a lot of support",deskripsi:["Minimal understanding of two-paragraph texts.","Can guess meaning of very few unfamiliar words.","Reads A2 text haltingly with support."]},
    2:{tajuk:"Level 2",nota:"With support",deskripsi:["Some understanding of main idea.","Can guess some unfamiliar words.","Reads A2 texts slowly with support."]},
    3:{tajuk:"Level 3",nota:"Adequate",deskripsi:["Understands main idea and details.","Can guess meaning from clues.","Reads A2 texts adequately."]},
    4:{tajuk:"Level 4",nota:"Clear response",deskripsi:["Understands and responds clearly most of the time.","Uses dictionary skills according to task.","Reads A2 texts and responds clearly."]},
    5:{tajuk:"Level 5",nota:"On track to exceed",deskripsi:["Good comprehension with minimal support.","Uses dictionary confidently."]},
    6:{tajuk:"Level 6",nota:"Exceeds expectations",deskripsi:["Understands A2 texts independently.","Guesses meaning confidently.","Uses dictionary skills independently."]}
  },
  "BM_T6": {
    1:{tajuk:"TP1 – Sangat Terhad",nota:"",deskripsi:["Membaca dan mentafsir maklumat pada tahap sangat terhad."]},
    2:{tajuk:"TP2 – Terhad",nota:"",deskripsi:["Membaca dan mentafsir maklumat pada tahap terhad."]},
    3:{tajuk:"TP3 – Memuaskan",nota:"",deskripsi:["Membaca dan mentafsir maklumat pada tahap memuaskan."]},
    4:{tajuk:"TP4 – Baik",nota:"",deskripsi:["Membaca dan mentafsir maklumat pada tahap kukuh."]},
    5:{tajuk:"TP5 – Sangat Baik",nota:"",deskripsi:["Membaca dan mentafsir maklumat pada tahap terperinci."]},
    6:{tajuk:"TP6 – Cemerlang",nota:"",deskripsi:["Membaca dan mentafsir maklumat pada tahap sangat terperinci dan konsisten."]}
  },
  "BM_T2": {
    1:{tajuk:"TP1 – Sangat Terhad",nota:"",deskripsi:["Membaca, memahami dan menaakul bahan pada tahap sangat terhad."]},
    2:{tajuk:"TP2 – Terhad",nota:"",deskripsi:["Membaca, memahami dan menaakul bahan pada tahap terhad."]},
    3:{tajuk:"TP3 – Memuaskan",nota:"",deskripsi:["Membaca, memahami dan menaakul bahan pada tahap memuaskan."]},
    4:{tajuk:"TP4 – Baik",nota:"",deskripsi:["Membaca, memahami dan menaakul bahan pada tahap kukuh."]},
    5:{tajuk:"TP5 – Sangat Baik",nota:"",deskripsi:["Membaca, memahami dan menaakul bahan pada tahap terperinci."]},
    6:{tajuk:"TP6 – Cemerlang",nota:"",deskripsi:["Membaca, memahami dan menaakul bahan pada tahap sangat terperinci dan menjadi model teladan."]}
  }
};

function detectStandardCode(bahasa, kelas){
  const k=(kelas||"").toLowerCase();
  if(bahasa==="Bahasa Melayu"){
    if(k.includes("6")) return "BM_T6";
    if(k.includes("2")) return "BM_T2";
    return "BM_T6";
  } else {
    if(k.includes("1")) return "BI_T1";
    if(k.includes("5")) return "BI_T5";
    return "BI_T1";
  }
}

function getStandardDesc(code,tp){
  const g=TP_STANDARDS[code];
  if(!g) return null;
  return g[tp]||null;
}

function kiraTP(peratus){
  if(peratus>=90) return 6;
  if(peratus>=75) return 5;
  if(peratus>=60) return 4;
  if(peratus>=45) return 3;
  if(peratus>=30) return 2;
  return 1;
}

function tambahRekod(nama,kelas,tempoh,wpm,peratus,tp,markah){
  const tbody=document.querySelector("#rekodTable tbody");
  const now=new Date();
  const tr=document.createElement("tr");
  tr.innerHTML = `<td>${now.toLocaleDateString()}</td><td>${now.toLocaleTimeString()}</td><td>${nama}</td><td>${kelas}</td><td>${tempoh}</td><td>${wpm}</td><td>${peratus}%</td><td>TP${tp}</td><td>${markah}</td>`;
  tbody.prepend(tr);
}

function simpanAnalisisKeStorage(data){
  localStorage.setItem("liba-last-analysis", JSON.stringify(data));
}

function bukaAnalisis(){ window.location.href = "hasil-bacaan.html"; }

function initSpeechRecognition(){
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SR) return null;
  const r = new SR();
  r.lang = "ms-MY";
  r.continuous = true;
  r.interimResults = true;
  return r;
}

function startRecognition(){
  if(!recognition) recognition = initSpeechRecognition();
  if(!recognition) return;
  recognition.start();
  recognizing = true;
  recognition.onresult = (event) => {
  let fullText = "";
  for (let i = event.resultIndex; i < event.results.length; i++) {
    fullText += event.results[i][0].transcript + " ";
  }
  transcriptText = (transcriptText + " " + fullText).trim();
  const ta = document.querySelector("#transkripAuto");
  if (ta) ta.value = transcriptText;

    let transcript = "";
    for(let i=event.resultIndex; i<event.results.length; i++){
      transcript += event.results[i][0].transcript;
    }
    const ta = $("#transkrip");
    if(ta) ta.value = transcript;
  };
}

function stopRecognition(){
  if(recognition && recognizing){
    recognition.stop();
    recognizing = false;
  }
}

/* === CAMERA PREVIEW === */
async function startCamera(){
  try {
    const video = $("#videoPreview");
    stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    video.srcObject = stream;
    video.style.display = "block";
    $("#btnHentiKamera").disabled = false;
  } catch (err) {
    alert("Kamera tidak dapat diakses. Sila benarkan kamera dalam pelayar / peranti.");
  }
}

function stopCamera(){
  const video = $("#videoPreview");
  if(stream){
    stream.getTracks().forEach(t => t.stop());
    stream = null;
  }
  video.srcObject = null;
  video.style.display = "none";
  $("#btnHentiKamera").disabled = true;
}

window.addEventListener("DOMContentLoaded", () => {
  const btnMula = $("#btnMula");
  const btnTamat = $("#btnTamat");
  const btnKamera = $("#btnKamera");
  const btnHentiKamera = $("#btnHentiKamera");
  const btnAnalisis = $("#btnAnalisis");
  const btnEksport = $("#btnEksport");

  if(btnMula){
    btnMula.addEventListener("click", () => {
      startTimer();
      startRecognition();
      btnMula.disabled = true;
      btnTamat.disabled = false;
    });
  }
  if(btnTamat){
    btnTamat.addEventListener("click", () => {
      stopTimer();
      stopRecognition();
      btnMula.disabled = false;
      btnTamat.disabled = true;

      const nama = $("#namaMurid").value || "Tanpa Nama";
      const kelas = $("#kelasMurid").value || "-";
      const bahasa = $("#bahasaMurid").value || "Bahasa Melayu";
      const text = $("#transkrip").value;
      const wpm = computeWPM(text, secondsElapsed);
      const peratus = percentFromWPM(wpm);
      const tp = kiraTP(peratus);

      tambahRekod(nama,kelas,secondsElapsed,wpm,peratus,tp,0);

      const bahasaKod = detectStandardCode(bahasa,kelas);
      const data = {
        nama,
        kelas,
        bahasa,
        bahasaKod,
        tempoh: secondsElapsed,
        wpm,
        peratus,
        tp,
        markahKuiz: 0,
        jumlahMarkah: peratus,
        tpAkhir: `TP${tp} – ${tp >= 4 ? "Menguasai" : "Tidak Menguasai"}`
      };
      simpanAnalisisKeStorage(data);
      alert("Rakaman bacaan selesai dan analisis disimpan.");
    });
  }

  if(btnKamera) btnKamera.addEventListener("click", startCamera);
  if(btnHentiKamera) btnHentiKamera.addEventListener("click", stopCamera);
  if(btnAnalisis) btnAnalisis.addEventListener("click", bukaAnalisis);

  if(btnEksport){
    btnEksport.addEventListener("click", () => {
      const rows = Array.from(document.querySelectorAll("#rekodTable tbody tr"));
      let csv = "Tarikh,Masa,Nama,Kelas,Tempoh(s),WPM,Peratus,TP,Markah Kuiz\n";
      rows.forEach(r => {
        const cols = Array.from(r.children).map(td => td.textContent);
        csv += cols.join(",") + "\n";
      });
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "rekod_bacaan_liba.csv";
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  // halaman analisis
  const analisisBox = document.querySelector("#analisis-bacaan");
  if(analisisBox){
    const saved = localStorage.getItem("liba-last-analysis");
    if(saved){
      const d = JSON.parse(saved);
      const std = getStandardDesc(d.bahasaKod, d.tp);
      let desHTML = "";
      if(std && std.deskripsi){
        desHTML = "<ul>" + std.deskripsi.map(t => `<li>${t}</li>`).join("") + "</ul>";
      }
      analisisBox.innerHTML = `
        <h2>Hasil Bacaan</h2>
        <p><strong>Nama:</strong> ${d.nama}</p>
        <p><strong>Kelas:</strong> ${d.kelas}</p>
        <p><strong>Bahasa:</strong> ${d.bahasa}</p>
        <p><strong>Tempoh:</strong> ${d.tempoh}s</p>
        <p><strong>WPM:</strong> ${d.wpm}</p>
        <p><strong>Peratus Bacaan:</strong> ${d.peratus}%</p>
        <p><strong>TP Bacaan:</strong> TP${d.tp} ${std ? "– " + std.tajuk : ""}</p>
        ${std && std.nota ? `<p><em>${std.nota}</em></p>` : ""}
        ${desHTML}
        <p><strong>Jumlah Markah:</strong> ${d.jumlahMarkah}%</p>
        <p><strong>TP Akhir:</strong> ${d.tpAkhir}</p>
        <button onclick="window.print()">Cetak Laporan</button>
      `;
    } else {
      analisisBox.textContent = "Belum ada bacaan direkodkan.";
    }
  }

  if("serviceWorker" in navigator){
    navigator.serviceWorker.register("sw.js").catch(()=>{});
  }
});

document.addEventListener("DOMContentLoaded", () => {
  const btnDownloadAudio = document.querySelector("#btnDownloadAudio");
  const btnDownloadVideo = document.querySelector("#btnDownloadVideo");
  if (btnDownloadAudio){
    btnDownloadAudio.addEventListener("click", () => {
      if (window.lastAudioBlob){
        downloadBlob(window.lastAudioBlob, "rakaman-liba.webm");
      } else {
        alert("Tiada rakaman audio ditemui.");
      }
    });
  }
  if (btnDownloadVideo){
    btnDownloadVideo.addEventListener("click", () => {
      if (window.lastVideoBlob){
        downloadBlob(window.lastVideoBlob, "rakaman-liba-video.webm");
      } else if (window.lastAudioBlob){
        // fallback ke audio
        downloadBlob(window.lastAudioBlob, "rakaman-liba.webm");
      } else {
        alert("Tiada rakaman video ditemui.");
      }
    });
  }
});

function janaKuizDaripadaTranskrip(textAsal){
  const teks = (textAsal || transcriptText || "").trim();
  const panel = document.querySelector("#panelKuizAuto");
  if (!panel) return;
  if (!teks){
    panel.innerHTML = "<p>Tiada teks untuk dijana.</p>";
    return;
  }
  const perkataan = teks.split(/\s+/).filter(Boolean);
  const soalan = [];
  for (let i=0;i<3 && i<perkataan.length;i++){
    const target = perkataan[i];
    soalan.push({
      soalan: "Pilih perkataan yang betul untuk melengkapkan ayat: ...",
      jawapan: target,
      pilihan: [target, (perkataan[i+1]||"membaca"), (perkataan[i+2]||"buku")]
    });
  }
  let html = "<h3>Kuiz Automatik</h3>";
  soalan.forEach((s,idx)=>{
    html += "<div class='soalan'>"+(idx+1)+". "+s.soalan+"<br>";
    s.pilihan.forEach((p)=>{
      html += "<label><input type='radio' name='k"+idx+"' value='"+p+"'> "+p+"</label> ";
    });
    html += "</div>";
  });
  html += "<button id='semakKuizAuto'>Semak Kuiz</button><div id='hasilKuizAuto'></div>";
  panel.innerHTML = html;
  const btn = document.querySelector("#semakKuizAuto");
  if (btn){
    btn.addEventListener("click", ()=>{
      let betul = 0;
      soalan.forEach((s,idx)=>{
        const pilih = document.querySelector("input[name='k"+idx+"']:checked");
        if (pilih && pilih.value === s.jawapan) betul++;
      });
      const h = document.querySelector("#hasilKuizAuto");
      if (h) h.innerHTML = "Markah anda: "+betul+"/"+soalan.length+" (10 markah maksimum => "+(betul* (10/soalan.length))+" )";
    });
  }
}


document.addEventListener("DOMContentLoaded", () => {
  const btnMula = document.querySelector("#btnMulaBaca");
  const btnTamat = document.querySelector("#btnTamatBaca");
  const btnCam = document.querySelector("#btnMulaKamera");
  const btnStopCam = document.querySelector("#btnHentiKamera");
  let cameraStream = null;

  async function startCamera(){
    try {
      const video = document.querySelector("#videoPreview");
      cameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      video.srcObject = cameraStream;
      if (btnCam) btnCam.disabled = true;
      if (btnStopCam) btnStopCam.disabled = false;
    } catch (e){
      alert("Kamera tidak dapat diakses. Sila benarkan kamera.");
    }
  }

  function stopCamera(){
    const video = document.querySelector("#videoPreview");
    if (video && video.srcObject){
      video.srcObject.getTracks().forEach(t => t.stop());
      video.srcObject = null;
    }
    cameraStream = null;
    if (btnCam) btnCam.disabled = false;
    if (btnStopCam) btnStopCam.disabled = true;
  }

  async function mulaBaca(){
    if (typeof startRecording === "function"){
      await startRecording();
    }
    if (typeof startRecognition === "function"){
      startRecognition();
    }
    if (btnMula) btnMula.disabled = true;
    if (btnTamat) btnTamat.disabled = false;
  }

  function tamatBaca(){
    if (typeof stopRecording === "function"){
      stopRecording();
    }
    if (typeof stopRecognition === "function"){
      stopRecognition();
    }
    if (btnMula) btnMula.disabled = false;
    if (btnTamat) btnTamat.disabled = true;
  }

  if (btnMula) btnMula.addEventListener("click", mulaBaca);
  if (btnTamat) btnTamat.addEventListener("click", tamatBaca);
  if (btnCam) btnCam.addEventListener("click", startCamera);
  if (btnStopCam) btnStopCam.addEventListener("click", stopCamera);
});
