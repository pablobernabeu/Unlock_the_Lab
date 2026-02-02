import"./modulepreload-polyfill-B5Qt9EMX.js";import{d as S}from"./firebase-config-DKpkfjBD.js";import{r as w,s as T,o as H}from"./firebase-4YSElDcj.js";let g=0,p=[],R=[],P=[],c=null,b={},U={},y=0,$="";const Q=30*60*1e3,j=5*60*1e3,M=50*60*1e3,ne=[15*60*1e3,5*60*1e3],oe=1*60*1e3;let L=null,d=Q,B=null,I=null,k=[],C=[],V=new Set;const se={"STUDY-101":1,"STUDY-102":5,"STUDY-103":6,"STUDY-104":1,"STUDY-105":5,"STUDY-106":4,"STUDY-107":2,"STUDY-108":7,"STUDY-109":4,"STUDY-110":6,"STUDY-111":2,"STUDY-112":1,"STUDY-113":6,"STUDY-114":5,"STUDY-115":3,"STUDY-116":5,"STUDY-117":1,"STUDY-118":4,"STUDY-119":7,"STUDY-120":2,"STUDY-121":5,"STUDY-122":6,"STUDY-123":1},K=100;document.addEventListener("DOMContentLoaded",async()=>{const e=re();if(c||(c=ae()),$=localStorage.getItem("userName"),$||($=ie(),localStorage.setItem("userName",$)),de(),await he(),console.log("Content loaded. Papers:",p.length),be(),console.log("Paper pages generated"),ye(),ve(),ce(),e&&Object.keys(b).length>0&&le(),pe(),fe(),y>0){const n=document.getElementById("total-score-header");n&&(n.innerHTML=`<span class="medal-icon">🏆</span> ${y}`,document.getElementById("score-banner").style.display="flex")}const t=e&&g>0?g:0;console.log("Showing page:",t,"hasState:",e,"currentPage:",g),q(t)});window.nextPage=$e;window.previousPage=Se;window.enableSubmit=we;window.submitRating=Ee;window.showHelp=Te;window.closeHelp=F;window.showTab=Be;function ae(){return"session_"+Date.now()+"_"+Math.random().toString(36).substr(2,9)}function ie(){const e=["Red","Blue","Green","Yellow","Purple","Orange","Pink","Teal","Brave","Wise","Swift","Tall","Happy","Clever","Bright","Quick","Mighty","Gentle","Bold","Cheerful","Curious","Friendly","Kind","Peaceful"],t=["Fox","Raccoon","Owl","Sparrow","Robin","Falcon","Eagle","Hawk","Rabbit","Squirrel","Deer","Bear","Wolf","Otter","Badger","Hedgehog","Dolphin","Seal","Penguin","Panda","Koala","Tiger","Lion","Leopard"],n=e[Math.floor(Math.random()*e.length)],o=t[Math.floor(Math.random()*t.length)];return`${n} ${o}`}function O(){const e={currentPage:g,userRatings:b,userPredictions:U,totalScore:y,sessionId:c};localStorage.setItem("workshopState",JSON.stringify(e))}function re(){try{const e=localStorage.getItem("workshopState");if(e){const t=JSON.parse(e);return g=t.currentPage||0,b=t.userRatings||{},U=t.userPredictions||{},y=t.totalScore||0,c=t.sessionId||null,!0}}catch(e){console.error("Error loading state:",e)}return!1}function le(){Object.keys(b).forEach(e=>{const t=p.findIndex(n=>n.id===e);if(t>=0){const n=document.getElementById(`rating-section-${t}`),o=document.getElementById(`results-${t}`);if(n&&(n.style.display="none"),o){o.style.display="block";const s=b[e],i=U[e];s&&i&&ee(t,e,s,i,!0)}}})}function ce(){document.querySelectorAll(".page").forEach(t=>{if(t.querySelector(".username-footer"))return;const n=document.createElement("div");n.className="username-footer",n.style.cssText="margin-top: 2rem; padding-top: 0.25rem; border-top: 2px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 0.9rem;",n.innerHTML=`Your username is <span style="color: #667eea; font-weight: 600;">${$}</span>`,t.querySelector(".container").appendChild(n)})}function de(){L=Date.now(),d=Q,Y();const e=setInterval(()=>{Date.now()-L>=M&&clearInterval(e),Y()},6e4);X(),J(),B=setTimeout(()=>{clearInterval(e),Z()},d)}function X(){k.forEach(e=>clearTimeout(e)),k=[],ne.forEach(e=>{const t=d-e;if(t>0&&!V.has(e)){const n=setTimeout(()=>{ue(e),V.add(e)},t);k.push(n)}})}function J(){I&&clearTimeout(I);const e=d-oe;e>0&&d<M&&(I=setTimeout(()=>{me()},e))}function ue(e){const t=Math.floor(e/6e4);alert(`⏰ ${t} minutes remaining in your session.`)}function me(){if(!(d<M)){alert("⏰ Your session will end in 1 minute. This is the maximum session duration.");return}const t=Math.floor(d/6e4),n=Math.floor(M/6e4),o=Math.floor(j/6e4);confirm(`⏰ Your ${t}-minute session will end in 1 minute.

Would you like to extend for ${o} more minutes?
(Maximum total: ${n} minutes)`)&&ge()}function ge(){B&&clearTimeout(B);const e=d+j;d=Math.min(e,M),X(),J(),B=setTimeout(()=>{Z()},d),Y();const t=Math.floor((d-(e-j))/6e4);t>0&&alert(`✅ Session extended! You have ${t} more minutes.`)}function Y(){const e=Date.now()-L,t=d-e,n=Math.floor(t/6e4),o=Object.keys(b).length,s=p.length||23,i=Math.max(0,s-o),a=document.getElementById("session-timer");a&&t>0?(a.textContent=`${n} min | ${i} paper${i!==1?"s":""} left`,t<=5*6e4?a.style.color="#f56565":t<=15*6e4?a.style.color="#fbbf24":a.style.color=""):a&&(a.textContent="Session ending...",a.style.color="#f56565")}function Z(){if(C.forEach(n=>{typeof n=="function"&&n()}),C=[],c){const n=w(S,`active/${c}`);T(n,null)}B&&clearTimeout(B),I&&clearTimeout(I),k.forEach(n=>clearTimeout(n));const e=document.createElement("div");e.style.cssText=`
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
    `,document.body.appendChild(e)}function pe(){const e=w(S,`active/${c}`);T(e,{joinedAt:Date.now(),lastActive:Date.now()}),setInterval(()=>{T(e,{joinedAt:Date.now(),lastActive:Date.now()})},3e4),window.addEventListener("beforeunload",()=>{T(e,null)})}function fe(){const e=document.getElementById("participant-counter");e&&(e.style.display="none");const t=w(S,"active"),n=H(t,o=>{const s=o.val();if(e)if(s&&Object.keys(s).length>0){const i=Object.keys(s).length;e.textContent=`${i} participant${i!==1?"s":""} active`,e.style.display="inline-block"}else e.style.display="none"},o=>{console.error("Error updating participant count:",o),e&&(e.style.display="none")});C.push(n)}async function he(){try{const[e,t,n]=await Promise.all([fetch("glossary.json").then(o=>o.json()),fetch("rubric.json").then(o=>o.json()),fetch("papers.json").then(o=>o.json())]);R=e,P=t,p=n,document.getElementById("total-papers").textContent=p.length}catch(e){console.error("Error loading content:",e),alert("Error loading workshop content. Please refresh the page.")}}function ye(){const e=document.getElementById("glossary-content"),t=document.getElementById("modal-glossary");if(!R||R.length===0){console.error("Glossary data not loaded");return}const n=R.map(o=>`
        <div class="glossary-item">
            <div class="glossary-term">${o.term}</div>
            <div class="glossary-definition">${o.definition}</div>
        </div>
    `).join("");e&&(e.innerHTML=n),t&&(t.innerHTML=n)}function ve(){const e=document.getElementById("rubric-content"),t=document.getElementById("modal-rubric");if(!P||P.length===0){console.error("Rubric data not loaded");return}const n=`
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
                ${P.map(o=>`
                    <tr>
                        <td><strong>${o.name}</strong></td>
                        <td>${o.low}</td>
                        <td>${o.medium}</td>
                        <td>${o.high}</td>
                    </tr>
                `).join("")}
            </tbody>
        </table>
    `;e&&(e.innerHTML=n),t&&(t.innerHTML=n)}function be(){const e=document.getElementById("paper-pages");p.forEach((t,n)=>{const o=`
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
        `;e.innerHTML+=o})}function q(e){console.log("showPage called with pageIndex:",e,"papers.length:",p.length),document.querySelectorAll(".page").forEach(o=>o.classList.remove("active"));let n;if(e===0)n=document.getElementById("page-welcome");else if(e===1)n=document.getElementById("page-guide");else if(e<=p.length+1){const o=e-2;console.log("Trying to show paper page:",o),n=document.getElementById(`page-paper-${o}`),console.log("Target page found:",!!n),document.getElementById("help-button").classList.add("visible"),document.getElementById("score-banner").style.display="flex"}else n=document.getElementById("page-final"),document.getElementById("help-button").classList.remove("visible"),De();n?(n.classList.add("active"),window.scrollTo(0,0)):console.error("Target page not found for pageIndex:",e),g=e,O()}function $e(){const e=p.length+3;g<e-1&&q(g+1)}function Se(){g>0&&q(g-1)}function we(e){const t=document.querySelector(`input[name="rating-${e}"]:checked`),n=document.querySelector(`input[name="prediction-${e}"]:checked`),o=document.getElementById(`submit-${e}`);o.disabled=!(t&&n)}async function Ee(e,t){const n=document.querySelector(`input[name="rating-${e}"]:checked`),o=document.querySelector(`input[name="prediction-${e}"]:checked`);if(!n||!o){alert("Please provide both your rating and your prediction before submitting.");return}const s=parseInt(n.value),i=parseInt(o.value);try{const a=document.getElementById(`submit-${e}`);a.disabled=!0,a.textContent="Submitting...",console.log("Submitting rating:",{paperId:t,sessionId:c,rating:s,prediction:i});const v=w(S,`ratings/${t}/${c}`);await T(v,{rating:s,prediction:i,timestamp:Date.now()}),console.log("Rating submitted successfully"),b[t]=s,U[t]=i,O(),document.getElementById(`rating-section-${e}`).style.display="none",ee(e,t,s,i)}catch(a){console.error("Error submitting rating:",a),console.error("Error details:",a.code,a.message),alert(`Error submitting rating: ${a.message}

Please check the browser console for details.`);const v=document.getElementById(`submit-${e}`);v.disabled=!1,v.textContent="Submit Both Ratings"}}async function ee(e,t,n,o,s=!1){const i=document.getElementById(`results-${e}`);i.style.display="block";const a=w(S,`ratings/${t}`),v=H(a,u=>{const l=u.val();if(l){const E=Object.values(l).map(r=>r.rating),W=se[t]||4,te=E.reduce((r,m)=>r+m,0)+W*K,_=E.length+K,f=te/_;E.length;const G=_,z=Math.round(f),N=document.getElementById(`your-rating-scale-${e}`),A=document.getElementById(`avg-rating-scale-${e}`);if(N&&A){N.querySelectorAll(".scale-cell").forEach(h=>{h.textContent="",h.className="scale-cell"}),A.querySelectorAll(".scale-cell").forEach(h=>{h.textContent="",h.className="scale-cell"});const r=N.querySelector(`[data-value="${n}"]`);r&&(r.textContent=n,r.className=`scale-cell active rating-${n}`);const m=A.querySelector(`[data-value="${z}"]`);m&&(m.textContent=f.toFixed(1),m.className=`scale-cell active rating-${z}`)}document.getElementById(`count-${e}`).textContent=`Based on ${G} participant${G!==1?"s":""}`;const D=document.getElementById(`score-${e}`);if(!D.textContent&&!s){const r=Math.abs(o-f),m=Math.max(0,100-Math.round(r*12));y+=m,D.textContent=`+${m} pts`,D.style.fontSize="2rem",D.style.fontWeight="bold",D.style.color=m>=88?"#10b981":m>=76?"#3b82f6":m>=64?"#f59e0b":"#ef4444";const h=document.getElementById(`score-msg-${e}`);h.innerHTML=r===0?`<strong>🎯 Perfect prediction!</strong><br>You nailed it: ${o} = ${f.toFixed(1)}`:r<=.5?`<strong>⭐ Outstanding!</strong><br>Predicted ${o}, actual ${f.toFixed(1)} — spot on!`:r<=1?`<strong>🎪 Excellent work!</strong><br>Predicted ${o}, actual ${f.toFixed(1)} — very close!`:r<=1.5?`<strong>👍 Great prediction!</strong><br>Predicted ${o}, actual ${f.toFixed(1)} — well done!`:r<=2.5?`<strong>👌 Good attempt!</strong><br>Predicted ${o}, actual ${f.toFixed(1)} — getting there!`:`<strong>💪 Keep learning!</strong><br>Predicted ${o}, actual ${f.toFixed(1)} — science perception is tricky!`,h.style.fontSize="0.95rem",h.style.lineHeight="1.5";const x=document.getElementById("total-score-header");x&&(x.innerHTML=`<span class="medal-icon">🏆</span> ${y}`,x.style.animation="scoreUpdate 0.5s ease",setTimeout(()=>x.style.animation="",500)),Y(),O()}}});C.push(v)}function Te(){document.getElementById("help-modal").classList.add("active"),document.body.style.overflow="hidden"}function F(){document.getElementById("help-modal").classList.remove("active"),document.body.style.overflow="auto"}function Be(e){document.querySelectorAll(".tab-btn").forEach(t=>{t.classList.remove("active")}),event.target.classList.add("active"),document.querySelectorAll(".tab-content").forEach(t=>{t.classList.remove("active")}),e==="glossary"?document.getElementById("modal-glossary").classList.add("active"):document.getElementById("modal-rubric").classList.add("active")}window.onclick=function(e){const t=document.getElementById("help-modal");e.target===t&&F()};window.addEventListener("keydown",function(e){if(e.key==="Escape"){const t=document.getElementById("help-modal");t&&t.classList.contains("active")&&F()}});function De(){document.getElementById("final-score").textContent=y,console.log("Saving to leaderboard:",{sessionId:c,totalScore:y,userName:$});const e=w(S,`leaderboard/${c}`);T(e,{score:y,timestamp:Date.now(),papersRated:Object.keys(b).length,userName:$}).then(()=>{console.log("Score saved successfully")}).catch(n=>{console.error("Error saving score:",n)});const t=w(S,"leaderboard");H(t,n=>{const o=n.val();if(console.log("Leaderboard data:",o),o){const s=Object.entries(o).map(([u,l])=>({id:u,score:l.score,timestamp:l.timestamp,userName:l.userName||"Anonymous"}));s.sort((u,l)=>l.score-u.score);const i=s.findIndex(u=>u.id===c)+1;document.getElementById("score-rank").textContent=`You ranked #${i} out of ${s.length} participant${s.length!==1?"s":""}!`;const v=s.slice(0,5).map((u,l)=>{const E=u.id===c;return`
                    <div class="leaderboard-entry ${E?"current-user":""}">
                        <span class="rank">${(l===0?"🥇":l===1?"🥈":l===2?"🥉":"")||`#${l+1}`}</span>
                        <span class="username">${u.userName}</span>
                        <span class="score">${u.score} pts</span>
                        ${E?'<span class="you-badge">You!</span>':""}
                    </div>
                `}).join("");document.getElementById("leaderboard-list").innerHTML=v||"<p>Be the first to complete!</p>"}})}
