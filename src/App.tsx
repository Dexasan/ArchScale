import {useMemo, useState} from "react";
import {compact, defaults, estimate, money, type Workload} from "./model";

type NumberKey = Exclude<keyof Workload, "availability">;

const fields: Array<{key: NumberKey; label: string; min: number; max: number; step: number; format?: (n:number)=>string}> = [
  {key:"monthlyUsers", label:"Monthly users", min:10_000, max:10_000_000, step:10_000, format:compact},
  {key:"dailyActivePct", label:"Daily active", min:1, max:100, step:1, format:n=>`${n}%`},
  {key:"requestsPerUser", label:"Requests / active user", min:1, max:500, step:1},
  {key:"peakMultiplier", label:"Peak multiplier", min:1, max:12, step:.5, format:n=>`${n}×`},
  {key:"readPct", label:"Read traffic", min:10, max:99, step:1, format:n=>`${n}%`},
  {key:"responseKb", label:"Average response", min:1, max:256, step:1, format:n=>`${n} KB`},
  {key:"storageKb", label:"Stored per user / month", min:1, max:500, step:1, format:n=>`${n} KB`},
  {key:"retentionMonths", label:"Retention", min:1, max:60, step:1, format:n=>`${n} mo`},
  {key:"regions", label:"Regions", min:1, max:5, step:1},
];

export default function App() {
  const [workload, setWorkload] = useState<Workload>(() => {
    try {
      const scenario = new URLSearchParams(location.search).get("scenario");
      return scenario ? {...defaults, ...JSON.parse(atob(scenario))} : defaults;
    } catch {
      return defaults;
    }
  });
  const [tab, setTab] = useState<"topology"|"numbers">("topology");
  const result = useMemo(() => estimate(workload), [workload]);
  const update = (key:NumberKey, value:number) => setWorkload(current => ({...current, [key]:value}));
  const copy = async () => {
    const url = new URL(location.href);
    url.searchParams.set("scenario", btoa(JSON.stringify(workload)));
    await navigator.clipboard.writeText(url.toString());
  };

  return <div className="app">
    <header className="mast">
      <a className="brand" href="/"><span>A/</span> ArchScale</a>
      <p>Capacity planning for first architecture decisions.</p>
      <div><button className="quiet" onClick={()=>setWorkload(defaults)}>Reset</button><button onClick={copy}>Copy scenario link</button></div>
    </header>

    <main>
      <section className="intro">
        <div><p className="kicker">SYSTEM DESIGN WORKBENCH / 01</p><h1>Before you draw boxes,<br/><em>size the problem.</em></h1></div>
        <p>Shape a workload and get an explainable baseline for throughput, storage, topology, and cost. Estimates are directional—not a substitute for measurement.</p>
      </section>

      <section className="workspace">
        <aside className="controls">
          <div className="section-title"><span>01</span><div><b>Workload shape</b><small>Drag to model demand</small></div></div>
          {fields.slice(0,5).map(field => <Control key={field.key} field={field} value={workload[field.key]} update={update}/>)}
          <div className="section-title second"><span>02</span><div><b>Data & reliability</b><small>Set operational constraints</small></div></div>
          {fields.slice(5).map(field => <Control key={field.key} field={field} value={workload[field.key]} update={update}/>)}
          <label className="select-label">Availability target
            <select value={workload.availability} onChange={event=>setWorkload({...workload,availability:event.target.value as Workload["availability"]})}>
              <option value="standard">Standard · 99.9%</option><option value="high">High · 99.95%</option><option value="critical">Critical · 99.99%</option>
            </select>
          </label>
        </aside>

        <div className="output">
          <div className="scoreboard">
            <Metric label="Peak throughput" value={`${compact(result.peakRps)} rps`} note={`${compact(result.averageRps)} average`}/>
            <Metric label="Monthly egress" value={`${compact(result.egressGbMonth)} GB`} note={`${workload.responseKb} KB responses`}/>
            <Metric label="Stored data" value={`${compact(result.storageGb)} GB`} note={`${workload.retentionMonths} month window`}/>
            <Metric label="Baseline cost" value={money(result.monthlyCost)} note="monthly estimate"/>
          </div>

          <div className="canvas">
            <div className="canvas-head">
              <div><p className="kicker">RECOMMENDED BASELINE</p><h2>{result.complexity} topology</h2></div>
              <div className="tabs"><button className={tab==="topology"?"active":""} onClick={()=>setTab("topology")}>Topology</button><button className={tab==="numbers"?"active":""} onClick={()=>setTab("numbers")}>Numbers</button></div>
            </div>
            {tab === "topology" ? <Topology result={result} regions={workload.regions}/> : <Numbers result={result}/>}
          </div>

          <div className="notes">
            <div className="section-title"><span>!</span><div><b>Design pressure</b><small>What deserves a deeper conversation</small></div></div>
            {result.warnings.length ? result.warnings.map((warning,index)=><article key={warning}><i>{String(index+1).padStart(2,"0")}</i><p>{warning}</p></article>) : <article><i>✓</i><p>This workload fits a deliberately boring architecture. Keep it simple and measure first.</p></article>}
          </div>
        </div>
      </section>
    </main>
    <footer><span>ARCHSCALE / ESTIMATOR V0.1</span><p>Assumptions: 180 rps per app instance · directional cloud pricing · no reserved discounts</p><span>BUILT FOR EXPLORATION</span></footer>
  </div>;
}

function Control({field,value,update}:{field:typeof fields[number];value:number;update:(key:NumberKey,value:number)=>void}) {
  return <label className="control"><div><span>{field.label}</span><output>{field.format?.(value)??value}</output></div><input aria-label={field.label} type="range" min={field.min} max={field.max} step={field.step} value={value} onChange={event=>update(field.key,Number(event.target.value))}/></label>;
}
function Metric({label,value,note}:{label:string;value:string;note:string}) {return <article className="metric"><span>{label}</span><strong>{value}</strong><small>{note}</small></article>}
function Topology({result,regions}:{result:ReturnType<typeof estimate>;regions:number}) {
  return <div className="topology">
    <Node kind="edge" title="Global edge" detail={`${regions} region${regions>1?"s":""}`}/>
    <Connector label={`${compact(result.peakRps)} rps`}/>
    <div className="cluster">{Array.from({length:Math.min(4,result.appInstances)},(_,i)=><Node key={i} kind="app" title={`App ${String(i+1).padStart(2,"0")}`} detail="stateless"/>) }{result.appInstances>4&&<span className="more">+{result.appInstances-4}</span>}</div>
    <Connector label={`${Math.round(result.readRps/result.peakRps*100)}% reads`}/>
    <div className="data-nodes"><Node kind="cache" title="Cache" detail={`${result.cacheMemoryGb} GB`}/><Node kind="db" title="Primary DB" detail={`${result.databaseReplicas} replicas`}/></div>
  </div>;
}
function Node({kind,title,detail}:{kind:string;title:string;detail:string}) {return <div className={`node ${kind}`}><i></i><b>{title}</b><small>{detail}</small></div>}
function Connector({label}:{label:string}) {return <div className="connector"><span></span><b>{label}</b><span></span></div>}
function Numbers({result}:{result:ReturnType<typeof estimate>}) {
  const rows=[["Daily active users",compact(result.dailyActiveUsers)],["Read throughput",`${compact(result.readRps)} rps`],["Write throughput",`${compact(result.writeRps)} rps`],["Application instances",result.appInstances],["Database nodes",result.databaseReplicas],["Cache allocation",`${result.cacheMemoryGb} GB`]];
  return <div className="number-table">{rows.map(([label,value])=><div key={label}><span>{label}</span><b>{value}</b></div>)}</div>;
}
