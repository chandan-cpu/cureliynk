const languages=[['en','English'],['hi','हिन्दी'],['as','অসমীয়া']];
export default function LanguageSelector({value,onChange}){return <label className="language-control"><span className="sr-only">Preferred language</span><select value={value} onChange={e=>onChange(e.target.value)} aria-label="Preferred language">{languages.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>}
