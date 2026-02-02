import"./modulepreload-polyfill-B5Qt9EMX.js";import{d as $}from"./firebase-config-mIbZvLPF.js";import{r as S,g as ae,s as E,o as F}from"./firebase-4YSElDcj.js";let f=0,d=[],R=[],k=[],c=null,w={},N={},v=0,b="";const J=30*60*1e3,q=5*60*1e3,D=50*60*1e3,ie=[15*60*1e3,5*60*1e3],re=1*60*1e3;let C=null,m=J,T=null,M=null,L=[],U=[],Q=new Set;const le={"STUDY-101":1,"STUDY-102":5,"STUDY-103":6,"STUDY-104":1,"STUDY-105":5,"STUDY-106":4,"STUDY-107":2,"STUDY-108":7,"STUDY-109":4,"STUDY-110":6,"STUDY-111":2,"STUDY-112":1,"STUDY-113":6,"STUDY-114":5,"STUDY-115":3,"STUDY-116":5,"STUDY-117":1,"STUDY-118":4,"STUDY-119":7,"STUDY-120":2,"STUDY-121":5,"STUDY-122":6,"STUDY-123":1},X=100;document.addEventListener("DOMContentLoaded",async()=>{const e=ue();if(c||(c=ce()),b=localStorage.getItem("userName"),b||(b=await de(),localStorage.setItem("userName",b)),pe(),await $e(),console.log("Content loaded. Papers:",d.length),Ee(),console.log("Paper pages generated"),Se(),we(),ge(),e&&Object.keys(w).length>0&&me(),ve(),be(),v>0){const n=document.getElementById("total-score-header");if(n){const o=d.length||23,s=Math.round(v/(o*100)*100);n.innerHTML=`<span class="medal-icon">🏆</span> ${s}%`,document.getElementById("score-banner").style.display="flex"}}const t=e&&f>0?f:0;console.log("Showing page:",t,"hasState:",e,"currentPage:",f),_(t)});window.nextPage=Te;window.previousPage=Be;window.enableSubmit=Me;window.submitRating=De;window.showHelp=Ie;window.closeHelp=G;window.showTab=xe;function ce(){return"session_"+Date.now()+"_"+Math.random().toString(36).substr(2,9)}function O(){const e=["Red","Blue","Green","Yellow","Purple","Orange","Pink","Teal","Brave","Wise","Swift","Tall","Happy","Clever","Bright","Quick","Mighty","Gentle","Bold","Cheerful","Curious","Friendly","Kind","Peaceful"],t=["Fox","Raccoon","Owl","Sparrow","Robin","Falcon","Eagle","Hawk","Rabbit","Squirrel","Deer","Bear","Wolf","Otter","Badger","Hedgehog","Dolphin","Seal","Penguin","Panda","Koala","Tiger","Lion","Leopard"],n=e[Math.floor(Math.random()*e.length)],o=t[Math.floor(Math.random()*t.length)];return`${n} ${o}`}async function de(){const e=S($,"leaderboard");try{const t=await ae(e),n=new Set;if(t.exists()){const i=t.val();Object.values(i).forEach(a=>{a.userName&&n.add(a.userName)})}let o=0,s;do if(s=O(),o++,o>=100){const i=O();let a=1;for(s=`${i} ${a}`;n.has(s);)a++,s=`${i} ${a}`;break}while(n.has(s));return s}catch(t){return console.error("Error checking username uniqueness:",t),O()}}function W(){const e={currentPage:f,userRatings:w,userPredictions:N,totalScore:v,sessionId:c};localStorage.setItem("workshopState",JSON.stringify(e))}function ue(){try{const e=localStorage.getItem("workshopState");if(e){const t=JSON.parse(e);return f=t.currentPage||0,w=t.userRatings||{},N=t.userPredictions||{},v=t.totalScore||0,c=t.sessionId||null,!0}}catch(e){console.error("Error loading state:",e)}return!1}function me(){Object.keys(w).forEach(e=>{const t=d.findIndex(n=>n.id===e);if(t>=0){const n=document.getElementById(`rating-section-${t}`),o=document.getElementById(`results-${t}`);if(n&&(n.style.display="none"),o){o.style.display="block";const s=w[e],i=N[e];s&&i&&ne(t,e,s,i,!0)}}})}function ge(){const e=document.getElementById("username-display-home");e&&(e.innerHTML=`Your username is <span style="color: #667eea; font-weight: 600;">${b}</span>`),document.querySelectorAll(".page").forEach(n=>{if(n.id==="page-welcome"||n.querySelector(".username-footer"))return;const o=document.createElement("div");o.className="username-footer",o.style.cssText="margin-top: 2rem; padding-top: 0.25rem; border-top: 2px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 0.9rem;",o.innerHTML=`Your username is <span style="color: #667eea; font-weight: 600;">${b}</span>`,n.querySelector(".container").appendChild(o)})}function pe(){C=Date.now(),m=J,Y();const e=setInterval(()=>{Date.now()-C>=D&&clearInterval(e),Y()},6e4);Z(),ee(),T=setTimeout(()=>{clearInterval(e),te()},m)}function Z(){L.forEach(e=>clearTimeout(e)),L=[],ie.forEach(e=>{const t=m-e;if(t>0&&!Q.has(e)){const n=setTimeout(()=>{fe(e),Q.add(e)},t);L.push(n)}})}function ee(){M&&clearTimeout(M);const e=m-re;e>0&&m<D&&(M=setTimeout(()=>{he()},e))}function fe(e){const t=Math.floor(e/6e4);alert(`⏰ ${t} minutes remaining in your session.`)}function he(){if(!(m<D)){alert("⏰ Your session will end in 1 minute. This is the maximum session duration.");return}const t=Math.floor(m/6e4),n=Math.floor(D/6e4),o=Math.floor(q/6e4);confirm(`⏰ Your ${t}-minute session will end in 1 minute.

Would you like to extend for ${o} more minutes?
(Maximum total: ${n} minutes)`)&&ye()}function ye(){T&&clearTimeout(T);const e=m+q;m=Math.min(e,D),Z(),ee(),T=setTimeout(()=>{te()},m),Y();const t=Math.floor((m-(e-q))/6e4);t>0&&alert(`✅ Session extended! You have ${t} more minutes.`)}function Y(){const e=Date.now()-C,t=m-e,n=Math.floor(t/6e4),o=Object.keys(w).length,s=d.length||23,i=Math.max(0,s-o),a=document.getElementById("session-timer");a&&t>0?(a.textContent=`${n} min | ${i} paper${i!==1?"s":""} left`,t<=5*6e4?a.style.color="#f56565":t<=15*6e4?a.style.color="#fbbf24":a.style.color=""):a&&(a.textContent="Session ending...",a.style.color="#f56565")}function te(){if(U.forEach(n=>{typeof n=="function"&&n()}),U=[],c){const n=S($,`active/${c}`);E(n,null)}T&&clearTimeout(T),M&&clearTimeout(M),L.forEach(n=>clearTimeout(n));const e=document.createElement("div");e.style.cssText=`
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
    `;const t=Math.floor((Date.now()-C)/6e4);e.innerHTML=`
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
    `,document.body.appendChild(e)}function ve(){const e=S($,`active/${c}`);E(e,{joinedAt:Date.now(),lastActive:Date.now()}),setInterval(()=>{E(e,{joinedAt:Date.now(),lastActive:Date.now()})},3e4),window.addEventListener("beforeunload",()=>{E(e,null)})}function be(){const e=document.getElementById("participant-counter");e&&(e.style.display="none");const t=S($,"active"),n=F(t,o=>{const s=o.val();if(e)if(s&&Object.keys(s).length>0){const i=Object.keys(s).filter(a=>{const g=s[a].timestamp;return g&&Date.now()-g<6e4}).length;i>0?(e.textContent=`${i} participant${i!==1?"s":""} active`,e.style.display="inline-block"):e.style.display="none"}else e.style.display="none"},o=>{console.error("Error updating participant count:",o),e&&(e.style.display="none")});U.push(n)}async function $e(){try{const[e,t,n]=await Promise.all([fetch("glossary.json").then(o=>o.json()),fetch("rubric.json").then(o=>o.json()),fetch("papers.json").then(o=>o.json())]);R=e,k=t,d=n,document.getElementById("total-papers").textContent=d.length}catch(e){console.error("Error loading content:",e),alert("Error loading workshop content. Please refresh the page.")}}function Se(){const e=document.getElementById("glossary-content"),t=document.getElementById("modal-glossary");if(!R||R.length===0){console.error("Glossary data not loaded");return}const n=R.map(o=>`
        <div class="glossary-item">
            <div class="glossary-term">${o.term}</div>
            <div class="glossary-definition">${o.definition}</div>
        </div>
    `).join("");e&&(e.innerHTML=n),t&&(t.innerHTML=n)}function we(){const e=document.getElementById("rubric-content"),t=document.getElementById("modal-rubric");if(!k||k.length===0){console.error("Rubric data not loaded");return}const n=`
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
                ${k.map(o=>`
                    <tr>
                        <td><strong>${o.name}</strong></td>
                        <td>${o.low}</td>
                        <td>${o.medium}</td>
                        <td>${o.high}</td>
                    </tr>
                `).join("")}
            </tbody>
        </table>
    `;e&&(e.innerHTML=n),t&&(t.innerHTML=n)}function Ee(){const e=document.getElementById("paper-pages");d.forEach((t,n)=>{const o=`
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
                            ${n<d.length-1?"Next Paper":"View Results"}
                        </button>
                    </div>
                </div>
            </div>
        `;e.innerHTML+=o})}function _(e){console.log("showPage called with pageIndex:",e,"papers.length:",d.length),document.querySelectorAll(".page").forEach(o=>o.classList.remove("active"));let n;if(e===0)n=document.getElementById("page-welcome");else if(e===1)n=document.getElementById("page-guide");else if(e<=d.length+1){const o=e-2;console.log("Trying to show paper page:",o),n=document.getElementById(`page-paper-${o}`),console.log("Target page found:",!!n),document.getElementById("help-button").classList.add("visible"),document.getElementById("score-banner").style.display="flex"}else n=document.getElementById("page-final"),document.getElementById("help-button").classList.remove("visible"),Pe();n?(n.classList.add("active"),window.scrollTo(0,0)):console.error("Target page not found for pageIndex:",e),f=e,W()}function Te(){const e=d.length+3;f<e-1&&_(f+1)}function Be(){f>0&&_(f-1)}function Me(e){const t=document.querySelector(`input[name="rating-${e}"]:checked`),n=document.querySelector(`input[name="prediction-${e}"]:checked`),o=document.getElementById(`submit-${e}`);o.disabled=!(t&&n)}async function De(e,t){const n=document.querySelector(`input[name="rating-${e}"]:checked`),o=document.querySelector(`input[name="prediction-${e}"]:checked`);if(!n||!o){alert("Please provide both your rating and your prediction before submitting.");return}const s=parseInt(n.value),i=parseInt(o.value);try{const a=document.getElementById(`submit-${e}`);a.disabled=!0,a.textContent="Submitting...",console.log("Submitting rating:",{paperId:t,sessionId:c,rating:s,prediction:i});const g=S($,`ratings/${t}/${c}`);await E(g,{rating:s,prediction:i,timestamp:Date.now()}),console.log("Rating submitted successfully"),w[t]=s,N[t]=i,W(),document.getElementById(`rating-section-${e}`).style.display="none",ne(e,t,s,i)}catch(a){console.error("Error submitting rating:",a),console.error("Error details:",a.code,a.message),alert(`Error submitting rating: ${a.message}

Please check the browser console for details.`);const g=document.getElementById(`submit-${e}`);g.disabled=!1,g.textContent="Submit Both Ratings"}}async function ne(e,t,n,o,s=!1){const i=document.getElementById(`results-${e}`);i.style.display="block";const a=S($,`ratings/${t}`),g=F(a,z=>{const I=z.val();if(I){const l=Object.values(I).map(r=>r.rating),u=le[t]||4,x=l.reduce((r,p)=>r+p,0)+u*X,j=l.length+X,h=x/j;l.length;const V=j,K=Math.round(h),A=document.getElementById(`your-rating-scale-${e}`),H=document.getElementById(`avg-rating-scale-${e}`);if(A&&H){A.querySelectorAll(".scale-cell").forEach(y=>{y.textContent="",y.className="scale-cell"}),H.querySelectorAll(".scale-cell").forEach(y=>{y.textContent="",y.className="scale-cell"});const r=A.querySelector(`[data-value="${n}"]`);r&&(r.textContent=n,r.className=`scale-cell active rating-${n}`);const p=H.querySelector(`[data-value="${K}"]`);p&&(p.textContent=h.toFixed(1),p.className=`scale-cell active rating-${K}`)}document.getElementById(`count-${e}`).textContent=`Based on ${V} participant${V!==1?"s":""}`;const B=document.getElementById(`score-${e}`);if(!B.textContent&&!s){const r=Math.abs(o-h),p=Math.max(0,100-Math.round(r*12));v+=p,B.textContent=`${p}%`,B.style.fontSize="2rem",B.style.fontWeight="bold",B.style.color=p>=88?"#10b981":p>=76?"#3b82f6":p>=64?"#f59e0b":"#ef4444";const y=document.getElementById(`score-msg-${e}`);y.innerHTML=r===0?`<strong>🎯 Perfect prediction!</strong><br>You nailed it: ${o} = ${h.toFixed(1)}`:r<=.5?`<strong>⭐ Outstanding!</strong><br>Predicted ${o}, actual ${h.toFixed(1)} — spot on!`:r<=1?`<strong>🎪 Excellent work!</strong><br>Predicted ${o}, actual ${h.toFixed(1)} — very close!`:r<=1.5?`<strong>👍 Great prediction!</strong><br>Predicted ${o}, actual ${h.toFixed(1)} — well done!`:r<=2.5?`<strong>👌 Good attempt!</strong><br>Predicted ${o}, actual ${h.toFixed(1)} — getting there!`:`<strong>💪 Keep learning!</strong><br>Predicted ${o}, actual ${h.toFixed(1)} — science perception is tricky!`,y.style.fontSize="0.95rem",y.style.lineHeight="1.5";const P=document.getElementById("total-score-header");if(P){const oe=d.length||23,se=Math.round(v/(oe*100)*100);P.innerHTML=`<span class="medal-icon">🏆</span> ${se}%`,P.style.animation="scoreUpdate 0.5s ease",setTimeout(()=>P.style.animation="",500)}Y(),W()}}});U.push(g)}function Ie(){document.getElementById("help-modal").classList.add("active"),document.body.style.overflow="hidden"}function G(){document.getElementById("help-modal").classList.remove("active"),document.body.style.overflow="auto"}function xe(e){document.querySelectorAll(".tab-btn").forEach(t=>{t.classList.remove("active")}),event.target.classList.add("active"),document.querySelectorAll(".tab-content").forEach(t=>{t.classList.remove("active")}),e==="glossary"?document.getElementById("modal-glossary").classList.add("active"):document.getElementById("modal-rubric").classList.add("active")}window.onclick=function(e){const t=document.getElementById("help-modal");e.target===t&&G()};window.addEventListener("keydown",function(e){if(e.key==="Escape"){const t=document.getElementById("help-modal");t&&t.classList.contains("active")&&G()}});function Pe(){const e=d.length||23,t=Math.round(v/(e*100)*100);document.getElementById("final-score").textContent=`${t}%`,console.log("Saving to leaderboard:",{sessionId:c,totalScore:v,userName:b});const n=S($,`leaderboard/${c}`);E(n,{score:v,timestamp:Date.now(),papersRated:Object.keys(w).length,userName:b}).then(()=>{console.log("Score saved successfully")}).catch(s=>{console.error("Error saving score:",s)});const o=S($,"leaderboard");F(o,s=>{const i=s.val();if(console.log("Leaderboard data:",i),i){const a=Object.entries(i).map(([l,u])=>({id:l,score:u.score,timestamp:u.timestamp,userName:u.userName||"Anonymous"}));a.sort((l,u)=>u.score-l.score);const g=a.findIndex(l=>l.id===c)+1;document.getElementById("score-rank").textContent=`You ranked #${g} out of ${a.length} participant${a.length!==1?"s":""}!`;const I=a.slice(0,5).map((l,u)=>{const x=l.id===c;return`
                    <div class="leaderboard-entry ${x?"current-user":""}">
                        <span class="rank">${(u===0?"🥇":u===1?"🥈":u===2?"🥉":"")||`#${u+1}`}</span>
                        <span class="username">${l.userName}</span>
                        <span class="score">${l.score} pts</span>
                        ${x?'<span class="you-badge">You!</span>':""}
                    </div>
                `}).join("");document.getElementById("leaderboard-list").innerHTML=I||"<p>Be the first to complete!</p>"}})}
