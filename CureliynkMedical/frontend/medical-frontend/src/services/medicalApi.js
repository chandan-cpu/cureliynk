const API_BASE_URL=import.meta.env.VITE_API_BASE_URL||'http://127.0.0.1:8000';
export async function submitMedicalQuery({query,latitude,longitude,language}){
 const response=await fetch(`${API_BASE_URL}/api/v1/medical/query`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query,latitude,longitude,language})});
 let data=null; try{data=await response.json()}catch{}
 if(!response.ok) throw new Error(data?.detail||`Request failed (${response.status})`);
 return data;
}
