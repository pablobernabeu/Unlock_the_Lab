import{i as X,g as J,a as Z,r as f,s as b,o as Y}from"./firebase-CqdP5AWb.js";(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))o(s);new MutationObserver(s=>{for(const i of s)if(i.type==="childList")for(const c of i.addedNodes)c.tagName==="LINK"&&c.rel==="modulepreload"&&o(c)}).observe(document,{childList:!0,subtree:!0});function n(s){const i={};return s.integrity&&(i.integrity=s.integrity),s.referrerPolicy&&(i.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?i.credentials="include":s.crossOrigin==="anonymous"?i.credentials="omit":i.credentials="same-origin",i}function o(s){if(s.ep)return;s.ep=!0;const i=n(s);fetch(s.href,i)}})();const ee={apiKey:"AIzaSyCjLzq8QNQqhGOpTJy3tzwuQrovMm6Vdi4",authDomain:"unlock-the-lab-workshop.firebaseapp.com",databaseURL:"https://unlock-the-lab-workshop-default-rtdb.europe-west1.firebasedatabase.app",projectId:"unlock-the-lab-workshop",storageBucket:"unlock-the-lab-workshop.firebasestorage.app",messagingSenderId:"604889899913",appId:"1:604889899913:web:d46afe88111e8bcb7d3758",measurementId:"G-HSC51V3CLP"},j=X(ee),h=J(j);Z(j);let M=0,$=[],H=[],q=[],u=null,U={},te={},S=0,w="";const F=30*60*1e3,x=5*60*1e3,T=50*60*1e3,ne=[15*60*1e3,5*60*1e3],oe=1*60*1e3;let L=null,r=F,v=null,E=null,I=[],R=[],O=new Set;const se={"STUDY-101":1,"STUDY-102":5,"STUDY-103":6,"STUDY-104":1,"STUDY-105":5,"STUDY-106":4,"STUDY-107":2,"STUDY-108":7,"STUDY-109":4,"STUDY-110":6,"STUDY-111":2,"STUDY-112":1,"STUDY-113":6,"STUDY-114":5,"STUDY-115":3,"STUDY-116":5,"STUDY-117":1,"STUDY-118":4,"STUDY-119":7,"STUDY-120":2,"STUDY-121":5,"STUDY-122":6,"STUDY-123":1},N=100;document.addEventListener("DOMContentLoaded",async()=>{const e=loadState();if(u||(u=ie()),w=sessionStorage.getItem("userName"),w||(w=ae(),sessionStorage.setItem("userName",w)),displayUsername(),re(),await ge(),pe(),fe(),he(),e&&Object.keys(U).length>0&&restoreSubmittedRatings(),ue(),me(),S>0){const t=document.getElementById("total-score-header");t&&(t.textContent=`Score: ${S}`,document.getElementById("score-banner").style.display="flex")}_(e?M:0)});window.nextPage=ye;window.enableSubmit=be;window.submitRating=ve;window.showHelp=Se;window.closeHelp=Q;window.showTab=we;function ie(){return"session_"+Date.now()+"_"+Math.random().toString(36).substr(2,9)}function ae(){const e=["Red","Blue","Green","Yellow","Purple","Orange","Pink","Teal","Brave","Wise","Swift","Tall","Happy","Clever","Bright","Quick","Mighty","Gentle","Bold","Cheerful","Curious","Friendly","Kind","Peaceful"],t=["Fox","Raccoon","Owl","Sparrow","Robin","Falcon","Eagle","Hawk","Rabbit","Squirrel","Deer","Bear","Wolf","Otter","Badger","Hedgehog","Dolphin","Seal","Penguin","Panda","Koala","Tiger","Lion","Leopard"],n=e[Math.floor(Math.random()*e.length)],o=t[Math.floor(Math.random()*t.length)];return`${n} ${o}`}function re(){L=Date.now(),r=F,C();const e=setInterval(()=>{Date.now()-L>=T&&clearInterval(e),C()},6e4);W(),z(),v=setTimeout(()=>{clearInterval(e),G()},r)}function W(){I.forEach(e=>clearTimeout(e)),I=[],ne.forEach(e=>{const t=r-e;if(t>0&&!O.has(e)){const n=setTimeout(()=>{ce(e),O.add(e)},t);I.push(n)}})}function z(){E&&clearTimeout(E);const e=r-oe;e>0&&r<T&&(E=setTimeout(()=>{le()},e))}function ce(e){const t=Math.floor(e/6e4);alert(`⏰ ${t} minutes remaining in your session.`)}function le(){if(!(r<T)){alert("⏰ Your session will end in 1 minute. This is the maximum session duration.");return}const t=Math.floor(r/6e4),n=Math.floor(T/6e4),o=Math.floor(x/6e4);confirm(`⏰ Your ${t}-minute session will end in 1 minute.

Would you like to extend for ${o} more minutes?
(Maximum total: ${n} minutes)`)&&de()}function de(){v&&clearTimeout(v);const e=r+x;r=Math.min(e,T),W(),z(),v=setTimeout(()=>{G()},r),C();const t=Math.floor((r-(e-x))/6e4);t>0&&alert(`✅ Session extended! You have ${t} more minutes.`)}function C(){const e=Date.now()-L,t=r-e,n=Math.floor(t/6e4),o=document.getElementById("session-timer");o&&t>0?(o.textContent=`${n} min remaining`,t<=5*6e4?o.style.color="#f56565":t<=15*6e4?o.style.color="#fbbf24":o.style.color=""):o&&(o.textContent="Session ending...",o.style.color="#f56565")}function G(){if(R.forEach(n=>{typeof n=="function"&&n()}),R=[],u){const n=f(h,`active/${u}`);b(n,null)}v&&clearTimeout(v),E&&clearTimeout(E),I.forEach(n=>clearTimeout(n));const e=document.createElement("div");e.style.cssText=`
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.9);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        color: white;
        text-align: center;
        padding: 20px;
    `;const t=Math.floor((Date.now()-L)/6e4);e.innerHTML=`
        <div>
            <h2 style="margin-bottom: 20px;">⏰ Session Expired</h2>
            <p style="margin-bottom: 20px;">
                Your ${t}-minute session has ended to conserve resources.<br>
                Thank you for participating!
            </p>
            <button onclick="location.reload()" style="
                background: #667eea;
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 8px;
                font-size: 16px;
                cursor: pointer;
            ">Start New Session</button>
        </div>
    `,document.body.appendChild(e)}function ue(){const e=f(h,`active/${u}`);b(e,{joinedAt:Date.now(),lastActive:Date.now()}),setInterval(()=>{b(e,{joinedAt:Date.now(),lastActive:Date.now()})},3e4),window.addEventListener("beforeunload",()=>{b(e,null)})}function me(){const e=document.getElementById("participant-counter");e&&(e.style.display="none");const t=f(h,"active"),n=Y(t,o=>{const s=o.val();if(e)if(s&&Object.keys(s).length>0){const i=Object.keys(s).length;e.textContent=`${i} participant${i!==1?"s":""} active`,e.style.display="inline-block"}else e.style.display="none"},o=>{console.error("Error updating participant count:",o),e&&(e.style.display="none")});R.push(n)}async function ge(){try{const[e,t,n]=await Promise.all([fetch("glossary.json").then(o=>o.json()),fetch("rubric.json").then(o=>o.json()),fetch("papers.json").then(o=>o.json())]);H=e,q=t,$=n,document.getElementById("total-papers").textContent=$.length}catch(e){console.error("Error loading content:",e),alert("Error loading workshop content. Please refresh the page.")}}function pe(){const e=document.getElementById("glossary-content"),t=document.getElementById("modal-glossary"),n=H.map(o=>`
        <div class="glossary-item">
            <div class="glossary-term">${o.term}</div>
            <div class="glossary-definition">${o.definition}</div>
        </div>
    `).join("");e.innerHTML=n,t.innerHTML=n}function fe(){const e=document.getElementById("rubric-content"),t=document.getElementById("modal-rubric"),n=`
        <table class="rubric-table">
            <thead>
                <tr>
                    <th>Category</th>
                    <th>Low (1-2)</th>
                    <th>Medium (3-5)</th>
                    <th>High (6-7)</th>
                </tr>
            </thead>
            <tbody>
                ${q.map(o=>`
                    <tr>
                        <td><strong>${o.name}</strong></td>
                        <td>${o.low}</td>
                        <td>${o.medium}</td>
                        <td>${o.high}</td>
                    </tr>
                `).join("")}
            </tbody>
        </table>
    `;e.innerHTML=n,t.innerHTML=n}function he(){const e=document.getElementById("paper-pages");$.forEach((t,n)=>{const o=`
            <div class="page" id="page-paper-${n}">
                <div class="container">
                    <div class="paper-card">
                        <div class="paper-header">
                            <div class="paper-id">${t.id}</div>
                            <h1 class="paper-title">${t.headline}</h1>
                        </div>
                        
                        <div class="paper-section">
                            <h3>📰 Access</h3>
                            <p>${t.access}</p>
                        </div>
                        
                        <div class="paper-section">
                            <h3>🔬 Study Overview</h3>
                            <p>${t.overview}</p>
                        </div>
                        
                        <div class="paper-section">
                            <h3>📊 Methods & Data</h3>
                            <p>${t.methods}</p>
                        </div>
                        
                        <div class="paper-section">
                            <h3>📝 Conclusion</h3>
                            <p>${t.conclusion}</p>
                        </div>
                        
                        <div class="paper-section">
                            <h3>🏛️ Source</h3>
                            <p>${t.source}</p>
                        </div>
                    </div>
                    
                    <div class="rating-section" id="rating-section-${n}">
                        <div style="background: #f0f4ff; padding: 15px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #667eea;">
                            <h3 style="margin: 0 0 10px 0; color: #667eea;">1️⃣ Your Scientific Assessment</h3>
                            <p style="font-size: 0.95rem; color: #444; margin: 0;">Review all six rubric criteria (Access, Headline, Theory, Methods, Conclusion, Source). Then assign your overall quality rating:</p>
                        </div>
                        <div class="rating-scale">
                            ${[1,2,3,4,5,6,7].map(s=>`
                                <div class="rating-option">
                                    <input type="radio" id="rating-${n}-${s}" 
                                           name="rating-${n}" value="${s}"
                                           onchange="enableSubmit(${n})">
                                    <label for="rating-${n}-${s}">${s}</label>
                                </div>
                            `).join("")}
                        </div>
                        <div class="rating-labels">
                            <span>Poor Quality</span>
                            <span>Excellent Quality</span>
                        </div>
                        
                        <div style="background: #fff3e0; padding: 15px; border-radius: 8px; margin: 30px 0 15px 0; border-left: 4px solid #ff9800;">
                            <h3 style="margin: 0 0 10px 0; color: #f57c00;">2️⃣ Predict the Crowd</h3>
                            <p style="font-size: 0.95rem; color: #444; margin: 0;">Now guess: What will the AVERAGE rating be from all workshop participants? Will others catch the same flaws you did?</p>
                        </div>
                        <div class="rating-scale">
                            ${[1,2,3,4,5,6,7].map(s=>`
                                <div class="rating-option">
                                    <input type="radio" id="prediction-${n}-${s}" 
                                           name="prediction-${n}" value="${s}"
                                           onchange="enableSubmit(${n})">
                                    <label for="prediction-${n}-${s}">${s}</label>
                                </div>
                            `).join("")}
                        </div>
                        <div class="rating-labels">
                            <span>Low Average</span>
                            <span>High Average</span>
                        </div>
                        
                        <button class="submit-rating" id="submit-${n}" 
                                onclick="submitRating(${n}, '${t.id}')" disabled>
                            Submit Both Ratings
                        </button>
                    </div>
                    
                    <div class="results-box" id="results-${n}" style="display: none;">
                        <h3>✅ Rating Submitted!</h3>
                        <div class="score-earned">
                            <div class="score-value" id="score-${n}"></div>
                            <div class="score-message" id="score-msg-${n}"></div>
                        </div>
                        <div class="rating-comparison">
                            <div class="rating-display">
                                <div class="label">Your Rating</div>
                                <div class="value" id="your-rating-${n}">-</div>
                            </div>
                            <div class="rating-display">
                                <div class="label">Average Rating</div>
                                <div class="value" id="avg-rating-${n}">-</div>
                            </div>
                        </div>
                        <div class="participant-count" id="count-${n}">
                            Calculating...
                        </div>
                        <button class="btn-primary" onclick="nextPage()" style="margin-top: 1.5rem;">
                            ${n<$.length-1?"Next Paper":"View Results"}
                        </button>
                    </div>
                </div>
            </div>
        `;e.innerHTML+=o})}function _(e){document.querySelectorAll(".page").forEach(o=>o.classList.remove("active"));let n;e===0?n=document.getElementById("page-welcome"):e===1?n=document.getElementById("page-guide"):e<=$.length+1?(n=document.getElementById(`page-paper-${e-2}`),document.getElementById("help-button").classList.add("visible"),document.getElementById("score-banner").style.display="flex"):(n=document.getElementById("page-final"),document.getElementById("help-button").classList.remove("visible"),Ee()),n&&(n.classList.add("active"),window.scrollTo(0,0)),M=e,saveState()}function ye(){const e=$.length+3;M<e-1&&_(M+1)}function be(e){const t=document.querySelector(`input[name="rating-${e}"]:checked`),n=document.querySelector(`input[name="prediction-${e}"]:checked`),o=document.getElementById(`submit-${e}`);o.disabled=!(t&&n)}async function ve(e,t){const n=document.querySelector(`input[name="rating-${e}"]:checked`),o=document.querySelector(`input[name="prediction-${e}"]:checked`);if(!n||!o){alert("Please provide both your rating and your prediction before submitting.");return}const s=parseInt(n.value),i=parseInt(o.value);try{const c=document.getElementById(`submit-${e}`);c.disabled=!0,c.textContent="Submitting...";const m=f(h,`ratings/${t}/${u}`);await b(m,{rating:s,prediction:i,timestamp:Date.now()}),U[t]=s,te[t]=i,saveState(),document.getElementById(`rating-section-${e}`).style.display="none",$e(e,t,s,i)}catch(c){console.error("Error submitting rating:",c),alert("Error submitting rating. Please try again.");const m=document.getElementById(`submit-${e}`);m.disabled=!1,m.textContent="Submit Both Ratings"}}async function $e(e,t,n,o,s=!1){const i=document.getElementById(`results-${e}`);i.style.display="block",document.getElementById(`your-rating-${e}`).textContent=n;const c=f(h,`ratings/${t}`),m=Y(c,l=>{const a=l.val();if(a){const y=Object.values(a).map(d=>d.rating),A=se[t]||4,V=y.reduce((d,p)=>d+p,0)+A*N,K=y.length+N,g=V/K,P=y.length;if(document.getElementById(`avg-rating-${e}`).textContent=g.toFixed(1),document.getElementById(`count-${e}`).textContent=`Based on ${P} participant${P!==1?"s":""}`,P>=2&&!document.getElementById(`score-${e}`).textContent&&!s){const d=Math.abs(o-g),p=Math.max(0,100-Math.round(d*12));S+=p;const B=document.getElementById(`score-${e}`);B.textContent=`+${p} pts`,B.style.fontSize="2rem",B.style.fontWeight="bold",B.style.color=p>=88?"#10b981":p>=76?"#3b82f6":p>=64?"#f59e0b":"#ef4444";const k=document.getElementById(`score-msg-${e}`);k.innerHTML=d===0?`<strong>🎯 Perfect prediction!</strong><br>You nailed it: ${o} = ${g.toFixed(1)}`:d<=.5?`<strong>⭐ Outstanding!</strong><br>Predicted ${o}, actual ${g.toFixed(1)} — spot on!`:d<=1?`<strong>🎪 Excellent work!</strong><br>Predicted ${o}, actual ${g.toFixed(1)} — very close!`:d<=1.5?`<strong>👍 Great prediction!</strong><br>Predicted ${o}, actual ${g.toFixed(1)} — well done!`:d<=2.5?`<strong>👌 Good attempt!</strong><br>Predicted ${o}, actual ${g.toFixed(1)} — getting there!`:`<strong>💪 Keep learning!</strong><br>Predicted ${o}, actual ${g.toFixed(1)} — science perception is tricky!`,k.style.fontSize="0.95rem",k.style.lineHeight="1.5";const D=document.getElementById("total-score-header");D&&(D.textContent=`Score: ${S}`,D.style.animation="scoreUpdate 0.5s ease",setTimeout(()=>D.style.animation="",500)),saveState()}}});R.push(m)}function Se(){document.getElementById("help-modal").classList.add("active"),document.body.style.overflow="hidden"}function Q(){document.getElementById("help-modal").classList.remove("active"),document.body.style.overflow="auto"}function we(e){document.querySelectorAll(".tab-btn").forEach(t=>{t.classList.remove("active")}),event.target.classList.add("active"),document.querySelectorAll(".tab-content").forEach(t=>{t.classList.remove("active")}),e==="glossary"?document.getElementById("modal-glossary").classList.add("active"):document.getElementById("modal-rubric").classList.add("active")}window.onclick=function(e){const t=document.getElementById("help-modal");e.target===t&&Q()};function Ee(){document.getElementById("final-score").textContent=S;const e=f(h,`leaderboard/${u}`);b(e,{score:S,timestamp:Date.now(),papersRated:Object.keys(U).length,userName:w});const t=f(h,"leaderboard");Y(t,n=>{const o=n.val();if(o){const s=Object.entries(o).map(([l,a])=>({id:l,score:a.score,timestamp:a.timestamp,userName:a.userName||"Anonymous"}));s.sort((l,a)=>a.score-l.score);const i=s.findIndex(l=>l.id===u)+1;document.getElementById("score-rank").textContent=`You ranked #${i} out of ${s.length} participant${s.length!==1?"s":""}!`;const m=s.slice(0,5).map((l,a)=>{const y=l.id===u;return`
                    <div class="leaderboard-entry ${y?"current-user":""}">
                        <span class="rank">${(a===0?"🥇":a===1?"🥈":a===2?"🥉":"")||`#${a+1}`}</span>
                        <span class="username">${l.userName}</span>
                        <span class="score">${l.score} pts</span>
                        ${y?'<span class="you-badge">You!</span>':""}
                    </div>
                `}).join("");document.getElementById("leaderboard-list").innerHTML=m||"<p>Be the first to complete!</p>"}})}
