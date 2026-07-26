import {useMemo, useState, type CSSProperties} from "react";
import {compact, defaults, estimate, money, type Workload} from "./model";

type NumberKey = Exclude<keyof Workload, "availability">;
type Field = {key:NumberKey; question:string; help:string; min:number; max:number; step:number; format:(n:number)=>string};

const essentials: Field[] = [
  {key:"monthlyUsers",question:"How many people use it each month?",help:"Your total monthly active users.",min:10_000,max:10_000_000,step:10_000,format:compact},
  {key:"dailyActivePct",question:"How many return on a typical day?",help:"18% is common for a weekly-use product.",min:1,max:100,step:1,format:n=>`${n}%`},
  {key:"requestsPerUser",question:"How active is each daily user?",help:"Page loads, searches, saves, and background calls.",min:1,max:500,step:1,format:n=>`${n} requests`},
  {key:"peakMultiplier",question:"How concentrated is your busiest hour?",help:"5× means peak traffic is five times the daily average.",min:1,max:12,step:.5,format:n=>`${n}× average`},
];

const advanced: Field[] = [
  {key:"readPct",question:"What portion of traffic only reads data?",help:"Feeds and dashboards are usually read-heavy.",min:10,max:99,step:1,format:n=>`${n}% reads`},
  {key:"responseKb",question:"How large is an average response?",help:"Compressed JSON or HTML returned to a user.",min:1,max:256,step:1,format:n=>`${n} KB`},
  {key:"storageKb",question:"How much data does one user add monthly?",help:"Profile, events, messages, or uploaded metadata.",min:1,max:500,step:1,format:n=>`${n} KB`},
  {key:"retentionMonths",question:"How long do you retain that data?",help:"Before deletion or cold archival.",min:1,max:60,step:1,format:n=>`${n} months`},
  {key:"regions",question:"How many geographic regions?",help:"One is simplest; multiple reduce global latency.",min:1,max:5,step:1,format:n=>`${n} region${n===1?"":"s"}`},
];

export default function App() {
  const [workload,setWorkload]=useState<Workload>(()=>readScenario());
  const [showAdvanced,setShowAdvanced]=useState(false);
  const [copied,setCopied]=useState(false);
  const result=useMemo(()=>estimate(workload),[workload]);
  const update=(key:NumberKey,value:number)=>setWorkload(current=>({...current,[key]:value}));
  const copy=async()=>{const url=new URL(location.href);url.searchParams.set("scenario",btoa(JSON.stringify(workload)));await navigator.clipboard.writeText(url.toString());setCopied(true);setTimeout(()=>setCopied(false),1800)};

  return <div className="app">
    <header>
      <a className="brand" href="/"><span>▲</span> ArchScale</a>
      <p>Free system capacity estimator</p>
      <div><button className="text-button" onClick={()=>setWorkload(defaults)}>Reset</button><button className="share" onClick={copy}>{copied?"Link copied":"Share scenario"}</button></div>
    </header>

    <main>
      <section className="hero">
        <span className="eyebrow">SYSTEM DESIGN, WITHOUT THE GUESSWORK</span>
        <h1>How much infrastructure<br/>does your app need?</h1>
        <p>Answer four questions. ArchScale turns your product usage into a practical starting architecture and monthly cost.</p>
      </section>

      <section className="planner">
        <div className="questions">
          <div className="panel-heading"><span>1</span><div><h2>Describe your traffic</h2><p>Move a slider and the recommendation updates immediately.</p></div></div>
          {essentials.map(field=><Control key={field.key} field={field} value={workload[field.key]} update={update}/>)}
          <button className="advanced-toggle" onClick={()=>setShowAdvanced(value=>!value)} aria-expanded={showAdvanced}>{showAdvanced?"Hide":"Show"} advanced assumptions <b>{showAdvanced?"−":"+"}</b></button>
          {showAdvanced&&<div className="advanced">
            {advanced.map(field=><Control key={field.key} field={field} value={workload[field.key]} update={update}/>)}
            <label className="availability"><div><b>How available must it be?</b><small>Higher targets need more redundant infrastructure.</small></div><select value={workload.availability} onChange={event=>setWorkload({...workload,availability:event.target.value as Workload["availability"]})}><option value="standard">Standard · 99.9%</option><option value="high">High · 99.95%</option><option value="critical">Critical · 99.99%</option></select></label>
          </div>}
        </div>

        <aside className="recommendation">
          <div className="result-title"><span>2</span><div><p>YOUR STARTING POINT</p><h2>{result.complexity} architecture</h2></div><i className={result.complexity.toLowerCase()}>{result.complexity==="Lean"?"Simple to operate":result.complexity==="Moderate"?"Plan for scaling":"Needs deliberate design"}</i></div>
          <div className="plain-answer"><p>At your busiest moment, plan to handle</p><strong>{compact(result.peakRps)} <small>requests / second</small></strong><span>That is about {compact(result.averageRps)} requests/second over the full day.</span></div>
          <div className="build-list">
            <h3>Start with this</h3>
            <BuildItem icon="▦" value={result.appInstances} label="application servers" explanation="Run your API and web application"/>
            <BuildItem icon="●" value={result.databaseReplicas} label="database nodes" explanation="One primary plus reliability replicas"/>
            <BuildItem icon="◆" value={`${result.cacheMemoryGb} GB`} label="cache memory" explanation="Protect the database from repeated reads"/>
            <BuildItem icon="◎" value={workload.regions} label={`region${workload.regions===1?"":"s"}`} explanation="Place the application near its users"/>
          </div>
          <div className="cost"><div><span>Estimated baseline</span><strong>{money(result.monthlyCost)}<small>/month</small></strong></div><p>Directional cloud estimate before discounts, support, and third-party services.</p></div>
          <details><summary>See how these numbers were calculated</summary><div className="math"><p><span>Daily active users</span><b>{compact(result.dailyActiveUsers)}</b></p><p><span>Read traffic at peak</span><b>{compact(result.readRps)} rps</b></p><p><span>Write traffic at peak</span><b>{compact(result.writeRps)} rps</b></p><p><span>Monthly network egress</span><b>{compact(result.egressGbMonth)} GB</b></p><p><span>Retained database data</span><b>{compact(result.storageGb)} GB</b></p></div></details>
          <div className="advice"><h3>What to think about next</h3>{result.warnings.length?result.warnings.map(warning=><p key={warning}><span>→</span>{warning}</p>):<p><span>✓</span>Keep the architecture simple. Add complexity only after measurements justify it.</p>}</div>
        </aside>
      </section>
    </main>
    <footer><b>ArchScale</b><span>Estimates are a planning baseline, not a provider quote.</span><a href="https://github.com/Dexasan/ArchScale">View the model on GitHub ↗</a></footer>
  </div>;
}

function Control({field,value,update}:{field:Field;value:number;update:(key:NumberKey,value:number)=>void}) {
  const progress=(value-field.min)/(field.max-field.min)*100;
  const style={"--fill":`${progress}%`} as CSSProperties;
  const change=(element:HTMLInputElement)=>update(field.key,Number(element.value));
  return <label className="control"><div className="control-copy"><div><b>{field.question}</b><small>{field.help}</small></div><output>{field.format(value)}</output></div><input style={style} aria-label={field.question} type="range" min={field.min} max={field.max} step={field.step} value={value} onInput={event=>change(event.currentTarget)} onChange={event=>change(event.currentTarget)}/><div className="range-labels"><span>{field.format(field.min)}</span><span>{field.format(field.max)}</span></div></label>;
}
function BuildItem({icon,value,label,explanation}:{icon:string;value:string|number;label:string;explanation:string}) {return <div className="build-item"><i>{icon}</i><div><strong>{value} {label}</strong><span>{explanation}</span></div></div>}
function readScenario():Workload {try{const value=new URLSearchParams(location.search).get("scenario");return value?{...defaults,...JSON.parse(atob(value))}:defaults}catch{return defaults}}
