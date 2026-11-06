"use strict";
const HUES={10:45,15:75,20:245,25:350,30:140,35:180,40:285,45:220,50:315,55:105,60:20};
const LEVELS=["Sector","Industry group","Industry","Sub-industry"];
const PLURAL=["sectors","industry groups","industries","sub-industries"];
const N={}, ORDER=[], SECTORS=[];
let TOTAL=0;
function load(rows){
  rows.forEach(r=>{
    const code=r.code, n={...r,note:r.note||"",lvl:code.length/2-1,kids:[],parent:code.length>2?code.slice(0,-2):null,sector:code.slice(0,2)};
    if(n.lvl===0)SECTORS.push(n);
    N[code]=n; ORDER.push(code);
    if(n.parent) N[n.parent].kids.push(code);
  });
  TOTAL=ORDER.length;
}
const $=id=>document.getElementById(id);
const el=(tag,attrs={},...kids)=>{const e=document.createElement(tag);for(const[k,v]of Object.entries(attrs)){if(k==="class")e.className=v;else if(k==="h")e.dataset.h="",e.style.setProperty("--h",v);else if(k.startsWith("on"))e.addEventListener(k.slice(2),v);else e.setAttribute(k,v)}kids.flat().forEach(c=>c!=null&&e.append(c));return e};
const pathOf=code=>{const out=[];for(let i=2;i<=code.length;i+=2)out.push(code.slice(0,i));return out};
const countBelow=(code,lvl)=>{let c=0;(function w(k){N[k].kids.forEach(x=>{if(N[x].lvl===lvl)c++;w(x)})})(code);return c};

/* per-viewer progress, best effort */
let seen=new Set();
try{seen=new Set(JSON.parse(localStorage.getItem("gics-seen")||"[]"))}catch(e){}
function markSeen(code){seen.add(code);try{localStorage.setItem("gics-seen",JSON.stringify([...seen]))}catch(e){}}

let current=null;
function go(code){location.hash=code?"c-"+code:"start"}
function route(){
  const m=location.hash.match(/^#c-(\d{2,8})$/);
  current=m&&N[m[1]]?m[1]:null;
  render(); window.scrollTo(0,0);
}

function anatomy(code,h){
  const wrap=el("div",{class:"anatomy",h,"aria-label":"Code anatomy"});
  for(let i=0;i<4;i++){
    const d=code.slice(i*2,i*2+2);
    wrap.append(el("div",{class:"pair"+(d?" set":"")+(d&&i===code.length/2-1?" cur":"")},
      el("div",{class:"d"},d||"··"),el("small",{},LEVELS[i].replace("Industry group","Group").replace("Sub-industry","Sub-ind."))));
  }
  return wrap;
}

function renderIntro(v){
  v.append(
    el("div",{class:"eyebrow"},"Global Industry Classification Standard"),
    el("h1",{},"Every listed company has an eight-digit address"),
    el("p",{class:"lede"},"GICS sorts companies by what they mainly do, in four levels that nest inside each other. Read a code two digits at a time and you can tell where a company sits, from its broad sector down to its exact line of business."),
    anatomy("45103010",220),
    el("p",{class:"prose"},"45 10 30 10 reads as Information Technology › Software & Services › Software › Application Software. Each step narrows the one before. Use the tour to walk all 273 stops in order, or jump in through any sector below."),
    el("div",{class:"counts"},...[11,25,74,163].map((n,i)=>el("div",{},el("b",{},String(n)),el("span",{},PLURAL[i])))),
    el("div",{class:"sec-head"},el("h2",{},"The 11 sectors"),el("span",{},"tap a sector to start there")),
    el("div",{class:"sgrid"},...SECTORS.map(s=>el("button",{class:"scard",type:"button",h:HUES[s.code],onclick:()=>go(s.code)},
      el("code",{},s.code),el("strong",{},s.name),
      el("span",{},`${countBelow(s.code,1)} grp · ${countBelow(s.code,2)} ind · ${countBelow(s.code,3)} sub`)))),
    el("h2",{class:"h2-gap"},"How a company gets its code"),
    el("div",{class:"prose"},
      el("p",{},"Each company receives exactly one sub-industry, chosen by its principal business activity. Revenue is the main test. Earnings and how the market perceives the business are also weighed, which matters for companies that straddle two industries."),
      el("p",{},"The standard was created in 1999 by MSCI and S&P Dow Jones Indices and is reviewed every year. Most changes are small, but a few reshaped the map:")),
    el("ol",{class:"timeline"},
      el("li",{},el("b",{},"2016"),el("span",{},"Real Estate split from Financials to become the 11th sector.")),
      el("li",{},el("b",{},"2018"),el("span",{},"Telecommunication Services widened into Communication Services, taking in media companies and internet platforms such as Alphabet and Meta.")),
      el("li",{},el("b",{},"2023"),el("span",{},"Payment networks moved to Financials, staples retailers like Walmart and Costco moved to Consumer Staples, internet and department-store retail merged into Broadline Retail, and data-processing firms moved to Industrials."))),
    el("p",{class:"fine"},"GICS is a trademark of MSCI and Standard & Poor's. This guide follows the structure in effect since the 2023 revision. Descriptions are plain-language summaries written for learning, not the official definitions; check MSCI's published methodology before relying on a classification. Company names are illustrative examples.")
  );
}

function renderNode(v,code){
  const n=N[code], h=HUES[n.sector];
  v.dataset.h=""; v.style.setProperty("--h",h);
  const crumbs=el("nav",{class:"crumbs","aria-label":"Breadcrumb"},el("button",{type:"button",onclick:()=>go(null)},"GICS"));
  pathOf(code).slice(0,-1).forEach(c=>crumbs.append(el("span",{"aria-hidden":"true"},"›"),el("button",{type:"button",onclick:()=>go(c)},N[c].name)));
  v.append(crumbs, anatomy(code,h),
    el("div",{class:"eyebrow"},`${LEVELS[n.lvl]} · ${code}`),
    el("h1",{},n.name),
    el("p",{class:"lede"},n.desc));
  if(n.lvl===0){
    v.append(el("div",{class:"facts"},
      el("div",{class:"fact"},el("h3",{},"What moves it"),el("ul",{},...n.drivers.map(d=>el("li",{},d)))),
      el("div",{class:"fact"},el("h3",{},"Well-known names"),el("div",{class:"chips"},...n.examples.map(x=>el("span",{class:"chip"},x))))));
  }
  if(n.note) v.append(el("div",{class:"note"},el("b",{},"Good to know"),n.note));
  if(n.kids.length){
    const lvl=n.lvl+1;
    v.append(el("div",{class:"sec-head"},el("h2",{},`Inside: ${n.kids.length} ${n.kids.length===1?LEVELS[lvl].toLowerCase():PLURAL[lvl]}`),
      lvl<3?el("span",{},`${countBelow(code,3)} sub-industries in all`):null));
    v.append(el("div",{class:"kids"},...n.kids.map(k=>kidRow(k))));
  } else {
    const sibs=N[n.parent].kids.filter(k=>k!==code);
    v.append(el("div",{class:"sec-head"},el("h2",{},sibs.length?`Neighbors in ${N[n.parent].name}`:"The only sub-industry in its industry"),
      el("span",{},sibs.length?`${sibs.length} other sub-industr${sibs.length===1?"y":"ies"}`:"")));
    if(sibs.length) v.append(el("div",{class:"kids"},...sibs.map(k=>kidRow(k))));
  }
}
function kidRow(k){
  const c=N[k];
  return el("button",{class:"kid"+(seen.has(k)?" seen":""),type:"button",onclick:()=>go(k)},
    el("code",{},k),
    el("div",{},el("strong",{},c.name),el("p",{},c.desc),
      c.kids.length&&!(c.kids.length===1&&N[c.kids[0]].name===c.name)?el("div",{class:"chips"},...c.kids.map(g=>el("span",{class:"chip"},N[g].name))):null));
}

function renderTree(){
  const t=$("tree"); t.replaceChildren();
  const q=$("q").value.trim().toLowerCase();
  if(q){
    const hits=ORDER.filter(c=>c.startsWith(q)||N[c].name.toLowerCase().includes(q)||N[c].desc.toLowerCase().includes(q)||(N[c].note||"").toLowerCase().includes(q))
      .sort((a,b)=>(N[b].name.toLowerCase().includes(q))-(N[a].name.toLowerCase().includes(q))).slice(0,30);
    t.className="tree results";
    if(!hits.length) t.append(el("li",{class:"empty"},"No matches. Try a company type, like \"pipelines\" or \"insurers\"."));
    hits.forEach(c=>t.append(el("li",{},el("button",{class:"tn",type:"button",h:HUES[N[c].sector],onclick:()=>{go(c)}},
      el("span",{class:"lvl"},`${LEVELS[N[c].lvl]} · ${N[N[c].sector].name}`),el("code",{},c),el("span",{},N[c].name)))));
    return;
  }
  t.className="tree";
  const path=current?pathOf(current):[];
  SECTORS.forEach(s=>{
    const li=el("li",{},el("button",{class:"tn sector"+(current===s.code?" on":path.includes(s.code)?" path":""),type:"button",h:HUES[s.code],onclick:()=>go(s.code)},el("code",{},s.code),el("span",{},s.name)));
    if(path[0]===s.code){
      const ul=el("ul",{});
      s.kids.forEach(g=>{
        const gli=el("li",{},el("button",{class:"tn"+(current===g?" on":path.includes(g)?" path":""),type:"button",h:HUES[s.code],onclick:()=>go(g)},el("code",{},g),el("span",{},N[g].name)));
        if(path.includes(g)){
          const ul2=el("ul",{});
          N[g].kids.forEach(i=>ul2.append(el("li",{},el("button",{class:"tn"+(current===i||(current&&current.startsWith(i)&&current.length>6)?" on":""),type:"button",h:HUES[s.code],onclick:()=>go(i)},el("code",{},i),el("span",{},N[i].name)))));
          gli.append(ul2);
        }
        ul.append(gli);
      });
      li.append(ul);
    }
    t.append(li);
  });
}

function render(){
  const v=$("view"); v.replaceChildren(); v.removeAttribute("data-h");
  if(current){markSeen(current);renderNode(v,current)} else renderIntro(v);
  renderTree();
  const idx=current?ORDER.indexOf(current):-1;
  $("prev").disabled=idx<0;
  $("next").disabled=idx>=TOTAL-1;
  $("next").textContent=idx<0?"Start the tour →":"Next →";
  const nxt=ORDER[idx+1];
  $("pos").replaceChildren(
    el("span",{},idx<0?`${TOTAL} stops`:`Stop ${idx+1} of ${TOTAL}`),
    el("b",{},nxt?`Next: ${N[nxt].name}`:"End of the tour"));
  $("prog").textContent=`${seen.size} of ${TOTAL} explored`;
  $("progbar").style.width=(seen.size/TOTAL*100)+"%";
  document.title=current?`${N[current].name} · GICS Field Guide`:"GICS Field Guide";
  $("rail").classList.remove("open"); $("menu").setAttribute("aria-expanded","false");
}

$("prev").onclick=()=>{const i=current?ORDER.indexOf(current):-1;go(i<=0?null:ORDER[i-1])};
$("next").onclick=()=>{const i=current?ORDER.indexOf(current):-1;if(i<TOTAL-1)go(ORDER[i+1])};
$("home").onclick=()=>go(null);
$("menu").onclick=()=>{const r=$("rail");r.classList.toggle("open");$("menu").setAttribute("aria-expanded",r.classList.contains("open"))};
$("q").addEventListener("input",()=>{renderTree();if($("q").value)$("rail").classList.add("open")});
document.addEventListener("keydown",e=>{
  if(e.target.closest("input"))return;
  if(e.key==="ArrowRight")$("next").click();
  if(e.key==="ArrowLeft")$("prev").click();
});
window.addEventListener("hashchange",route);
fetch("data/gics.json").then(r=>{if(!r.ok)throw new Error(r.status);return r.json()}).then(rows=>{load(rows);route()})
  .catch(()=>{$("view").replaceChildren(el("p",{class:"lede"},"The classification data didn't load. Check your connection and reload the page."))});
