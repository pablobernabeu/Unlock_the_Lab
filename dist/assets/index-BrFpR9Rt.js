import{i as oe,g as se,a as ae,r as $,s as T,o as j}from"./firebase-CqdP5AWb.js";(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))o(s);new MutationObserver(s=>{for(const a of s)if(a.type==="childList")for(const i of a.addedNodes)i.tagName==="LINK"&&i.rel==="modulepreload"&&o(i)}).observe(document,{childList:!0,subtree:!0});function n(s){const a={};return s.integrity&&(a.integrity=s.integrity),s.referrerPolicy&&(a.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?a.credentials="include":s.crossOrigin==="anonymous"?a.credentials="omit":a.credentials="same-origin",a}function o(s){if(s.ep)return;s.ep=!0;const a=n(s);fetch(s.href,a)}})();const ie={apiKey:"AIzaSyCjLzq8QNQqhGOpTJy3tzwuQrovMm6Vdi4",authDomain:"unlock-the-lab-workshop.firebaseapp.com",databaseURL:"https://unlock-the-lab-workshop-default-rtdb.europe-west1.firebasedatabase.app",projectId:"unlock-the-lab-workshop",storageBucket:"unlock-the-lab-workshop.firebasestorage.app",messagingSenderId:"604889899913",appId:"1:604889899913:web:d46afe88111e8bcb7d3758",measurementId:"G-HSC51V3CLP"},V=oe(ie),S=se(V);ae(V);let g=0,p=[],P=[],x=[],m=null,b={},N={},v=0,E="";const K=30*60*1e3,O=5*60*1e3,M=50*60*1e3,re=[15*60*1e3,5*60*1e3],ce=1*60*1e3;let k=null,l=K,B=null,D=null,R=[],C=[],_=new Set;const le={"STUDY-101":1,"STUDY-102":5,"STUDY-103":6,"STUDY-104":1,"STUDY-105":5,"STUDY-106":4,"STUDY-107":2,"STUDY-108":7,"STUDY-109":4,"STUDY-110":6,"STUDY-111":2,"STUDY-112":1,"STUDY-113":6,"STUDY-114":5,"STUDY-115":3,"STUDY-116":5,"STUDY-117":1,"STUDY-118":4,"STUDY-119":7,"STUDY-120":2,"STUDY-121":5,"STUDY-122":6,"STUDY-123":1},Q=100;document.addEventListener("DOMContentLoaded",async()=>{const e=me();if(m||(m=de()),E=localStorage.getItem("userName"),E||(E=ue(),localStorage.setItem("userName",E)),fe(),await Se(),console.log("Content loaded. Papers:",p.length),Te(),console.log("Paper pages generated"),we(),Ee(),pe(),e&&Object.keys(b).length>0&&ge(),ve(),$e(),v>0){const n=document.getElementById("total-score-header");n&&(n.innerHTML=`<span class="medal-icon">🏆</span> ${v}`,document.getElementById("score-banner").style.display="flex")}const t=e&&g>0?g:0;console.log("Showing page:",t,"hasState:",e,"currentPage:",g),q(t)});window.nextPage=Be;window.previousPage=Ie;window.enableSubmit=De;window.submitRating=Me;window.showHelp=Le;window.closeHelp=F;window.showTab=Pe;function de(){return"session_"+Date.now()+"_"+Math.random().toString(36).substr(2,9)}function ue(){const e=["Red","Blue","Green","Yellow","Purple","Orange","Pink","Teal","Brave","Wise","Swift","Tall","Happy","Clever","Bright","Quick","Mighty","Gentle","Bold","Cheerful","Curious","Friendly","Kind","Peaceful"],t=["Fox","Raccoon","Owl","Sparrow","Robin","Falcon","Eagle","Hawk","Rabbit","Squirrel","Deer","Bear","Wolf","Otter","Badger","Hedgehog","Dolphin","Seal","Penguin","Panda","Koala","Tiger","Lion","Leopard"],n=e[Math.floor(Math.random()*e.length)],o=t[Math.floor(Math.random()*t.length)];return`${n} ${o}`}function H(){const e={currentPage:g,userRatings:b,userPredictions:N,totalScore:v,sessionId:m};localStorage.setItem("workshopState",JSON.stringify(e))}function me(){try{const e=localStorage.getItem("workshopState");if(e){const t=JSON.parse(e);return g=t.currentPage||0,b=t.userRatings||{},N=t.userPredictions||{},v=t.totalScore||0,m=t.sessionId||null,!0}}catch(e){console.error("Error loading state:",e)}return!1}function ge(){Object.keys(b).forEach(e=>{const t=p.findIndex(n=>n.id===e);if(t>=0){const n=document.getElementById(`rating-section-${t}`),o=document.getElementById(`results-${t}`);if(n&&(n.style.display="none"),o){o.style.display="block";const s=b[e],a=N[e];s&&a&&ee(t,e,s,a,!0)}}})}function pe(){document.querySelectorAll(".page").forEach(t=>{if(t.querySelector(".username-footer"))return;const n=document.createElement("div");n.className="username-footer",n.style.cssText="margin-top: 2rem; padding-top: 0.25rem; border-top: 2px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 0.9rem;",n.innerHTML=`Your username is <span style="color: #667eea; font-weight: 600;">${E}</span>`,t.querySelector(".container").appendChild(n)})}function fe(){k=Date.now(),l=K,Y();const e=setInterval(()=>{Date.now()-k>=M&&clearInterval(e),Y()},6e4);J(),X(),B=setTimeout(()=>{clearInterval(e),Z()},l)}function J(){R.forEach(e=>clearTimeout(e)),R=[],re.forEach(e=>{const t=l-e;if(t>0&&!_.has(e)){const n=setTimeout(()=>{he(e),_.add(e)},t);R.push(n)}})}function X(){D&&clearTimeout(D);const e=l-ce;e>0&&l<M&&(D=setTimeout(()=>{ye()},e))}function he(e){const t=Math.floor(e/6e4);alert(`⏰ ${t} minutes remaining in your session.`)}function ye(){if(!(l<M)){alert("⏰ Your session will end in 1 minute. This is the maximum session duration.");return}const t=Math.floor(l/6e4),n=Math.floor(M/6e4),o=Math.floor(O/6e4);confirm(`⏰ Your ${t}-minute session will end in 1 minute.

Would you like to extend for ${o} more minutes?
(Maximum total: ${n} minutes)`)&&be()}function be(){B&&clearTimeout(B);const e=l+O;l=Math.min(e,M),J(),X(),B=setTimeout(()=>{Z()},l),Y();const t=Math.floor((l-(e-O))/6e4);t>0&&alert(`✅ Session extended! You have ${t} more minutes.`)}function Y(){const e=Date.now()-k,t=l-e,n=Math.floor(t/6e4),o=Object.keys(b).length,s=p.length||23,a=Math.max(0,s-o),i=document.getElementById("session-timer");i&&t>0?(i.textContent=`${n} min | ${a} paper${a!==1?"s":""} left`,t<=5*6e4?i.style.color="#f56565":t<=15*6e4?i.style.color="#fbbf24":i.style.color=""):i&&(i.textContent="Session ending...",i.style.color="#f56565")}function Z(){if(C.forEach(n=>{typeof n=="function"&&n()}),C=[],m){const n=$(S,`active/${m}`);T(n,null)}B&&clearTimeout(B),D&&clearTimeout(D),R.forEach(n=>clearTimeout(n));const e=document.createElement("div");e.style.cssText=`
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
    `;const t=Math.floor((Date.now()-k)/6e4);e.innerHTML=`
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
    `,document.body.appendChild(e)}function ve(){const e=$(S,`active/${m}`);T(e,{joinedAt:Date.now(),lastActive:Date.now()}),setInterval(()=>{T(e,{joinedAt:Date.now(),lastActive:Date.now()})},3e4),window.addEventListener("beforeunload",()=>{T(e,null)})}function $e(){const e=document.getElementById("participant-counter");e&&(e.style.display="none");const t=$(S,"active"),n=j(t,o=>{const s=o.val();if(e)if(s&&Object.keys(s).length>0){const a=Object.keys(s).length;e.textContent=`${a} participant${a!==1?"s":""} active`,e.style.display="inline-block"}else e.style.display="none"},o=>{console.error("Error updating participant count:",o),e&&(e.style.display="none")});C.push(n)}async function Se(){try{const[e,t,n]=await Promise.all([fetch("glossary.json").then(o=>o.json()),fetch("rubric.json").then(o=>o.json()),fetch("papers.json").then(o=>o.json())]);P=e,x=t,p=n,document.getElementById("total-papers").textContent=p.length}catch(e){console.error("Error loading content:",e),alert("Error loading workshop content. Please refresh the page.")}}function we(){const e=document.getElementById("glossary-content"),t=document.getElementById("modal-glossary");if(!P||P.length===0){console.error("Glossary data not loaded");return}const n=P.map(o=>`
        <div class="glossary-item">
            <div class="glossary-term">${o.term}</div>
            <div class="glossary-definition">${o.definition}</div>
        </div>
    `).join("");e&&(e.innerHTML=n),t&&(t.innerHTML=n)}function Ee(){const e=document.getElementById("rubric-content"),t=document.getElementById("modal-rubric");if(!x||x.length===0){console.error("Rubric data not loaded");return}const n=`
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
                ${x.map(o=>`
                    <tr>
                        <td><strong>${o.name}</strong></td>
                        <td>${o.low}</td>
                        <td>${o.medium}</td>
                        <td>${o.high}</td>
                    </tr>
                `).join("")}
            </tbody>
        </table>
    `;e&&(e.innerHTML=n),t&&(t.innerHTML=n)}function Te(){const e=document.getElementById("paper-pages");p.forEach((t,n)=>{const o=`
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
                            <div class="rating-scale-grid">
                                <div class="scale-label">Your Rating</div>
                                <div class="scale-row" id="your-rating-scale-${n}">
                                    ${[1,2,3,4,5,6,7].map(s=>`<div class="scale-cell" data-value="${s}"></div>`).join("")}
                                </div>
                            </div>
                            <div class="rating-scale-grid">
                                <div class="scale-label">Average Rating</div>
                                <div class="scale-row" id="avg-rating-scale-${n}">
                                    ${[1,2,3,4,5,6,7].map(s=>`<div class="scale-cell" data-value="${s}"></div>`).join("")}
                                </div>
                            </div>
                        </div>
                        <div class="participant-count" id="count-${n}">
                            Calculating...
                        </div>
                        <button class="btn-primary" onclick="nextPage()" style="margin-top: 1.5rem;">
                            ${n<p.length-1?"Next Paper":"View Results"}
                        </button>
                    </div>
                </div>
            </div>
        `;e.innerHTML+=o})}function q(e){console.log("showPage called with pageIndex:",e,"papers.length:",p.length),document.querySelectorAll(".page").forEach(o=>o.classList.remove("active"));let n;if(e===0)n=document.getElementById("page-welcome");else if(e===1)n=document.getElementById("page-guide");else if(e<=p.length+1){const o=e-2;console.log("Trying to show paper page:",o),n=document.getElementById(`page-paper-${o}`),console.log("Target page found:",!!n),document.getElementById("help-button").classList.add("visible"),document.getElementById("score-banner").style.display="flex"}else n=document.getElementById("page-final"),document.getElementById("help-button").classList.remove("visible"),xe();n?(n.classList.add("active"),window.scrollTo(0,0)):console.error("Target page not found for pageIndex:",e),g=e,H()}function Be(){const e=p.length+3;g<e-1&&q(g+1)}function Ie(){g>0&&q(g-1)}function De(e){const t=document.querySelector(`input[name="rating-${e}"]:checked`),n=document.querySelector(`input[name="prediction-${e}"]:checked`),o=document.getElementById(`submit-${e}`);o.disabled=!(t&&n)}async function Me(e,t){const n=document.querySelector(`input[name="rating-${e}"]:checked`),o=document.querySelector(`input[name="prediction-${e}"]:checked`);if(!n||!o){alert("Please provide both your rating and your prediction before submitting.");return}const s=parseInt(n.value),a=parseInt(o.value);try{const i=document.getElementById(`submit-${e}`);i.disabled=!0,i.textContent="Submitting...";const y=$(S,`ratings/${t}/${m}`);await T(y,{rating:s,prediction:a,timestamp:Date.now()}),b[t]=s,N[t]=a,H(),document.getElementById(`rating-section-${e}`).style.display="none",ee(e,t,s,a)}catch(i){console.error("Error submitting rating:",i),alert("Error submitting rating. Please try again.");const y=document.getElementById(`submit-${e}`);y.disabled=!1,y.textContent="Submit Both Ratings"}}async function ee(e,t,n,o,s=!1){const a=document.getElementById(`results-${e}`);a.style.display="block";const i=$(S,`ratings/${t}`),y=j(i,d=>{const c=d.val();if(c){const w=Object.values(c).map(r=>r.rating),z=le[t]||4,te=w.reduce((r,u)=>r+u,0)+z*Q,ne=w.length+Q,f=te/ne,G=w.length,W=Math.round(f),U=document.getElementById(`your-rating-scale-${e}`),A=document.getElementById(`avg-rating-scale-${e}`);if(U&&A){U.querySelectorAll(".scale-cell").forEach(h=>{h.textContent="",h.className="scale-cell"}),A.querySelectorAll(".scale-cell").forEach(h=>{h.textContent="",h.className="scale-cell"});const r=U.querySelector(`[data-value="${n}"]`);r&&(r.textContent=n,r.className=`scale-cell active rating-${n}`);const u=A.querySelector(`[data-value="${W}"]`);u&&(u.textContent=f.toFixed(1),u.className=`scale-cell active rating-${W}`)}document.getElementById(`count-${e}`).textContent=`Based on ${G} participant${G!==1?"s":""}`;const I=document.getElementById(`score-${e}`);if(!I.textContent&&!s){const r=Math.abs(o-f),u=Math.max(0,100-Math.round(r*12));v+=u,I.textContent=`+${u} pts`,I.style.fontSize="2rem",I.style.fontWeight="bold",I.style.color=u>=88?"#10b981":u>=76?"#3b82f6":u>=64?"#f59e0b":"#ef4444";const h=document.getElementById(`score-msg-${e}`);h.innerHTML=r===0?`<strong>🎯 Perfect prediction!</strong><br>You nailed it: ${o} = ${f.toFixed(1)}`:r<=.5?`<strong>⭐ Outstanding!</strong><br>Predicted ${o}, actual ${f.toFixed(1)} — spot on!`:r<=1?`<strong>🎪 Excellent work!</strong><br>Predicted ${o}, actual ${f.toFixed(1)} — very close!`:r<=1.5?`<strong>👍 Great prediction!</strong><br>Predicted ${o}, actual ${f.toFixed(1)} — well done!`:r<=2.5?`<strong>👌 Good attempt!</strong><br>Predicted ${o}, actual ${f.toFixed(1)} — getting there!`:`<strong>💪 Keep learning!</strong><br>Predicted ${o}, actual ${f.toFixed(1)} — science perception is tricky!`,h.style.fontSize="0.95rem",h.style.lineHeight="1.5";const L=document.getElementById("total-score-header");L&&(L.innerHTML=`<span class="medal-icon">🏆</span> ${v}`,L.style.animation="scoreUpdate 0.5s ease",setTimeout(()=>L.style.animation="",500)),Y(),H()}}});C.push(y)}function Le(){document.getElementById("help-modal").classList.add("active"),document.body.style.overflow="hidden"}function F(){document.getElementById("help-modal").classList.remove("active"),document.body.style.overflow="auto"}function Pe(e){document.querySelectorAll(".tab-btn").forEach(t=>{t.classList.remove("active")}),event.target.classList.add("active"),document.querySelectorAll(".tab-content").forEach(t=>{t.classList.remove("active")}),e==="glossary"?document.getElementById("modal-glossary").classList.add("active"):document.getElementById("modal-rubric").classList.add("active")}window.onclick=function(e){const t=document.getElementById("help-modal");e.target===t&&F()};window.addEventListener("keydown",function(e){if(e.key==="Escape"){const t=document.getElementById("help-modal");t&&t.classList.contains("active")&&F()}});function xe(){document.getElementById("final-score").textContent=v;const e=$(S,`leaderboard/${m}`);T(e,{score:v,timestamp:Date.now(),papersRated:Object.keys(b).length,userName:E});const t=$(S,"leaderboard");j(t,n=>{const o=n.val();if(o){const s=Object.entries(o).map(([d,c])=>({id:d,score:c.score,timestamp:c.timestamp,userName:c.userName||"Anonymous"}));s.sort((d,c)=>c.score-d.score);const a=s.findIndex(d=>d.id===m)+1;document.getElementById("score-rank").textContent=`You ranked #${a} out of ${s.length} participant${s.length!==1?"s":""}!`;const y=s.slice(0,5).map((d,c)=>{const w=d.id===m;return`
                    <div class="leaderboard-entry ${w?"current-user":""}">
                        <span class="rank">${(c===0?"🥇":c===1?"🥈":c===2?"🥉":"")||`#${c+1}`}</span>
                        <span class="username">${d.userName}</span>
                        <span class="score">${d.score} pts</span>
                        ${w?'<span class="you-badge">You!</span>':""}
                    </div>
                `}).join("");document.getElementById("leaderboard-list").innerHTML=y||"<p>Be the first to complete!</p>"}})}
