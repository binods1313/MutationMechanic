import React, { useState, useEffect } from 'react';
import {
  Loader, AlertTriangle, User, Activity, Target, Pill, Users, Clock
} from 'lucide-react';
import { backendService } from '../services/backendService';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

interface RiskScore {
  cardiovascular: number;
  cancer: number;
  neurodegenerative: number;
  metabolic: number;
  biologicalAge: number;
  chronologicalAge: number;
  longevityScore: number;
  topInterventions: string[]; 
}

const DiseaseTracerTab: React.FC = () => {
  const [patientId, setPatientId] = useState<string>('');
  const [patients, setPatients] = useState<{id: string, patientId: string, name?: string}[]>([]);
  const [riskData, setRiskData] = useState<RiskScore | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'risk-details' | 'ancestral-timeline' | 'interventions' | 'population-comparison' | 'variant-browser'>('risk-details');
  const [error, setError] = useState<string | null>(null);

  // Fetch patients from backend service
  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const patientData = await backendService.getPatients();
        setPatients(patientData);
      } catch (err) {
        console.error('Error fetching patients:', err);
        setError('Failed to load patients');
      }
    };

    fetchPatients();
  }, []);

  // Load risk profile when button is clicked
  const loadRiskProfile = async () => {
    if (!patientId) return;
    
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`http://localhost:5000/api/risk-assessment/${patientId}`);
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      setRiskData(data);
    } catch (err: any) {
      setError(`Error loading risk profile: ${err.message}`);
      console.error('Error loading risk profile:', err);
    }
    setLoading(false);
  };

  // Prepare data for the bar chart
  const riskChartData = riskData ? [
    { name: 'Cardiovascular', risk: riskData.cardiovascular },
    { name: 'Cancer', risk: riskData.cancer },
    { name: 'Neurodegenerative', risk: riskData.neurodegenerative },
    { name: 'Metabolic', risk: riskData.metabolic }
  ] : [];

  // Utility helpers to avoid inline styles and map data to CSS classes
  const clampPercent = (p: number) => Math.max(0, Math.min(100, Math.round(p)));
  const getPercentClass = (p?: number) => `w-p-${clampPercent(p ?? 0)}`;
  const clampPx = (v: number, max = 50) => Math.max(1, Math.min(max, Math.round(v)));
  const getHeightClass = (v?: number) => `h-px-${clampPx(v ?? 1, 50)}`;
  const mapHexToVariant = (hex?: string) => {
    const mapping: Record<string, string> = {
      '#ef4444': 'ef4444',
      '#f59e0b': 'f59e0b',
      '#8b5cf6': '8b5cf6',
      '#06b6d4': '06b6d4',
      '#6b7280': '6b7280',
      '#10b981': '10b981'
    };
    const key = (hex || '').toLowerCase();
    const normalized = mapping[key] || '6b7280';
    return {
      bg: `bg-variant-${normalized}`,
      bgAlpha: `bg-variant-${normalized}-20`,
      text: `text-variant-${normalized}`
    };
  };
  const longevityBgClass = (longevity?: number) => {
    if ((longevity ?? 0) > 80) return 'bg-variant-10b981';
    if ((longevity ?? 0) > 60) return 'bg-variant-f59e0b';
    return 'bg-variant-ef4444';
  };

  // Custom tooltip component to avoid using inline contentStyle
  const CustomTooltip: React.FC<any> = ({ active, payload }) => {
    if (!active || !payload || !payload.length) return null;
    return (
      <div className="risk-tooltip p-2 rounded text-sm">
        <div className="font-bold">{payload[0].name}</div>
        <div>{payload[0].value}%</div>
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h1 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
          <Activity className="text-scientific-blue" size={32} /> Disease Tracer
        </h1>
        
        {/* Patient Selection Section */}
        <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6">
          <div className="flex items-center gap-3 flex-1">
            <User className="text-scientific-blue" size={20} />
            <select
              aria-label="Select patient"
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:border-primary focus:outline-none"
            >
              <option value="">Select Patient</option>
              {patients.map(p => (
                <option key={p.id} value={p.patientId}>
                  {p.name || p.patientId} {p.name ? `(${p.patientId})` : ''}
                </option>
              ))}
            </select>
          </div>
          
          <button
            onClick={loadRiskProfile}
            disabled={loading || !patientId}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold transition-all ${
              loading || !patientId
                ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                : 'bg-primary hover:bg-primary-hover text-white'
            }`}
          >
            {loading ? (
              <>
                <Loader className="animate-spin" size={18} /> Loading Risk Profile...
              </>
            ) : (
              <>
                <Target size={18} /> Load Risk Profile
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-800 rounded-xl p-4 flex items-center gap-3 mb-6">
            <AlertTriangle className="text-red-400" size={24} />
            <div>
              <h3 className="text-red-300 font-bold">Error</h3>
              <p className="text-red-400">{error}</p>
            </div>
          </div>
        )}
        
        {riskData && (
          <div className="space-y-6">
            {/* Main Dashboard - 4 Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Card A: Risk Overview */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
                <h3 className="font-bold text-white mb-3 flex items-center gap-2">
                  <Activity size={20} className="text-scientific-blue" /> Risk Overview
                </h3>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm text-slate-300">
                      <span>Cardiovascular</span>
                      <span className="text-white">{riskData.cardiovascular}%</span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2 mt-1">
                      <div className={`bg-red-500 h-2 rounded-full ${getPercentClass(riskData?.cardiovascular)}`}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm text-slate-300">
                      <span>Cancer</span>
                      <span className="text-white">{riskData.cancer}%</span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2 mt-1">
                      <div className={`bg-orange-500 h-2 rounded-full ${getPercentClass(riskData?.cancer)}`}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm text-slate-300">
                      <span>Neuro</span>
                      <span className="text-white">{riskData.neurodegenerative}%</span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2 mt-1">
                      <div className={`bg-purple-500 h-2 rounded-full ${getPercentClass(riskData?.neurodegenerative)}`}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm text-slate-300">
                      <span>Metabolic</span>
                      <span className="text-white">{riskData.metabolic}%</span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2 mt-1">
                      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-to-interactive-role */}
                      {/* eslint-disable-next-line react/no-unknown-property */}
                      <div className={`bg-yellow-500 h-2 rounded-full ${getPercentClass(riskData?.metabolic)}`}></div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Card B: Biological Age */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
                <h3 className="font-bold text-white mb-3 flex items-center gap-2">
                  <Clock size={20} className="text-scientific-blue" /> Biological Age
                </h3>
                <div className="text-center">
                  <p className="text-3xl font-bold text-white">{riskData.biologicalAge}y</p>
                  <p className="text-slate-400 mt-1">Chronological: {riskData.chronologicalAge}y</p>
                  <div className={`mt-3 text-sm font-bold ${
                    riskData.biologicalAge > riskData.chronologicalAge 
                      ? 'text-red-400' 
                      : riskData.biologicalAge < riskData.chronologicalAge 
                        ? 'text-green-400' 
                        : 'text-yellow-400'
                  }`}>
                    {(riskData.biologicalAge > riskData.chronologicalAge ? '+' : '') + 
                     (riskData.biologicalAge - riskData.chronologicalAge)} years
                  </div>
                </div>
              </div>
              
              {/* Card C: Longevity Score */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
                <h3 className="font-bold text-white mb-3 flex items-center gap-2">
                  <Target size={20} className="text-scientific-blue" /> Longevity Score
                </h3>
                <div className="text-center">
                  <div className="relative inline-block">
                    <svg className="w-24 h-24" viewBox="0 0 100 100">
                      <circle
                        cx="50"
                        cy="50"
                        r="45"
                        fill="none"
                        stroke="#334155"
                        strokeWidth="8"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="45"
                        fill="none"
                        stroke={riskData.longevityScore > 70 ? "#10b981" : riskData.longevityScore > 40 ? "#f59e0b" : "#ef4444"}
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray="283"
                        strokeDashoffset={283 - (283 * riskData.longevityScore) / 100}
                        transform="rotate(-90 50 50)"
                      />
                    </svg>
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
                      <span className="text-xl font-bold text-white">{riskData.longevityScore}</span>
                    </div>
                  </div>
                  <p className="text-slate-400 text-sm mt-2">Out of 100</p>
                </div>
              </div>
              
              {/* Card D: Top Interventions */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
                <h3 className="font-bold text-white mb-3 flex items-center gap-2">
                  <Pill size={20} className="text-scientific-blue" /> Top Interventions
                </h3>
                <div className="space-y-2">
                  {riskData.topInterventions.map((intervention, index) => (
                    <div key={index} className="text-sm text-slate-300">
                      <div className="flex items-start">
                        <span className="mr-2">•</span>
                        <span>{intervention}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-1 flex flex-wrap gap-1">
              <button
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'risk-details'
                    ? 'bg-primary text-white shadow-lg'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                onClick={() => setActiveTab('risk-details')}
              >
                Risk Details
              </button>
              <button
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all relative ${
                  activeTab === 'ancestral-timeline'
                    ? 'bg-primary text-white shadow-lg'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                onClick={() => setActiveTab('ancestral-timeline')}
              >
                Ancestral Timeline
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">NEW</span>
              </button>
              <button
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'interventions'
                    ? 'bg-primary text-white shadow-lg'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                onClick={() => setActiveTab('interventions')}
              >
                Interventions
              </button>
              <button
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all relative ${
                  activeTab === 'population-comparison'
                    ? 'bg-primary text-white shadow-lg'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                onClick={() => setActiveTab('population-comparison')}
              >
                Population Comparison
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">NEW</span>
              </button>
              <button
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all relative ${
                  activeTab === 'variant-browser'
                    ? 'bg-primary text-white shadow-lg'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                onClick={() => setActiveTab('variant-browser')}
              >
                Variant Browser
                <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">BETA</span>
              </button>
            </div>

            {/* Tab Content */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              {activeTab === 'risk-details' && (
                <div>
                  <h3 className="text-xl font-bold text-white mb-4">Risk Details</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={riskChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="name" stroke="#94a3b8" />
                        <YAxis stroke="#94a3b8" />
                        {/* eslint-disable-next-line react/no-unstable-nested-components */}
                        <Tooltip content={<CustomTooltip/>} formatter={(value) => [`${value}%`, 'Risk']} />
                        <Legend />
                        <Bar dataKey="risk" name="Risk Percentage" fill="#06b6d4" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {activeTab === 'ancestral-timeline' && (
                <div>
                  <h3 className="text-xl font-bold text-white mb-4">Ancestral Timeline</h3>

                  {/* Timeline Visualization */}
                  <div className="mb-8">
                    <h4 className="text-lg font-bold text-white mb-3">Mutation Evolution Timeline</h4>
                    <div className="relative bg-slate-800/50 border border-slate-700 rounded-xl p-4 overflow-x-auto">
                      <div className="timeline-container relative">
                        {/* Main timeline line */}
                        <div className="absolute left-0 right-0 top-8 h-1 bg-gradient-to-r from-purple-600 via-teal-500 to-green-500"></div>

                        {/* Timeline events */}
                        <div className="flex justify-between relative z-10 pb-8">
                          {[52000, 10000, 500, 1600, 1989, 2025].map((year, index) => {
                            const periodNames = [
                              "Original Mutation", "Neolithic Expansion", "Medieval Spread",
                              "Colonial Distribution", "Discovery", "Present Day"
                            ];

                            const descriptions = [
                              "ΔF508 deletion emerged in CFTR gene",
                              "Migration with agricultural populations",
                              "Possible heterozygote advantage against cholera/typhoid",
                              "European colonization spreads variant globally",
                              "CFTR gene and ΔF508 mutation identified",
                              "Highest frequency in Northern European populations"
                            ];

                            return (
                              <div key={index} className="flex flex-col items-center">
                                <div className={`w-4 h-4 rounded-full border-4 ${
                                  index === 0 ? 'border-purple-500 bg-purple-500/20' :
                                  index === 1 ? 'border-teal-500 bg-teal-500/20' :
                                  index === 2 ? 'border-blue-500 bg-blue-500/20' :
                                  index === 3 ? 'border-yellow-500 bg-yellow-500/20' :
                                  index === 4 ? 'border-orange-500 bg-orange-500/20' :
                                  'border-green-500 bg-green-500/20'
                                }`}></div>
                                <div className="mt-2 text-center">
                                  <div className="text-sm font-bold text-white">{year > 0 ? year : Math.abs(year) + ' BCE'}</div>
                                  <div className="text-xs text-slate-400 max-w-24">{periodNames[index]}</div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Event details */}
                      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                          { year: "52,000 BCE", event: "Original Mutation", location: "Northern Europe / Caucasus Region", desc: "ΔF508 deletion emerged in CFTR gene", freq: "<0.1%", icon: "🧬" },
                          { year: "10,000 BCE", event: "Neolithic Expansion", location: "Western Europe", desc: "Migration with agricultural populations", freq: "~2%", icon: "🌍" },
                          { year: "500 CE", event: "Medieval Spread", location: "Europe (widespread)", desc: "Possible heterozygote advantage against cholera/typhoid", freq: "~4%", icon: "📈" },
                          { year: "1500-1900 CE", event: "Colonial Distribution", location: "Americas, Australia", desc: "European colonization spreads variant globally", freq: "Varies", icon: "🌐" }
                        ].map((item, index) => (
                          <div key={index} className="bg-slate-900/50 border border-slate-700 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xl">{item.icon}</span>
                              <span className="font-bold text-white">{item.year}</span>
                            </div>
                            <h5 className="font-bold text-scientific-blue">{item.event}</h5>
                            <p className="text-sm text-slate-400">{item.location}</p>
                            <p className="text-xs text-slate-300 mt-1">{item.desc}</p>
                            <div className="mt-2 text-xs">
                              <span className="text-slate-400">Frequency:</span>
                              <span className="text-white ml-1">{item.freq}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Geographic Origins */}
                  <div className="mb-8">
                    <h4 className="text-lg font-bold text-white mb-3">Geographic Origins & Migration</h4>
                    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h5 className="font-bold text-white mb-2">Primary Origin</h5>
                          <p className="text-slate-300">Northern Europe</p>
                          <p className="text-slate-400 text-sm">Coordinates: 54.5260° N, 15.2551° E</p>
                        </div>
                        <div>
                          <h5 className="font-bold text-white mb-2">Selective Pressure</h5>
                          <p className="text-slate-300">Heterozygote advantage</p>
                          <p className="text-slate-400 text-sm">Possible protection against cholera and typhoid</p>
                        </div>
                      </div>

                      <div className="mt-4">
                        <h5 className="font-bold text-white mb-2">Migration Paths</h5>
                        <ul className="space-y-2 text-sm text-slate-300">
                          <li className="flex items-start">
                            <span className="text-scientific-blue mr-2">•</span>
                            <span><strong>Caucasus → Northern Europe</strong>: Around 50,000 BCE</span>
                          </li>
                          <li className="flex items-start">
                            <span className="text-scientific-blue mr-2">•</span>
                            <span><strong>Northern Europe → Western Europe</strong>: Around 10,000 BCE</span>
                          </li>
                          <li className="flex items-start">
                            <span className="text-scientific-blue mr-2">•</span>
                            <span><strong>Europe → North America</strong>: 1600-1900 CE</span>
                          </li>
                          <li className="flex items-start">
                            <span className="text-scientific-blue mr-2">•</span>
                            <span><strong>Europe → Australia</strong>: 1788-1900 CE</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'interventions' && (
                <div>
                  <h3 className="text-xl font-bold text-white mb-4">Recommended Interventions</h3>
                  <div className="space-y-3">
                    {riskData.topInterventions.map((intervention, index) => (
                      <div key={index} className="p-3 bg-slate-900/50 rounded-lg border border-slate-700">
                        <p className="text-white">{intervention}</p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-slate-400">
                          <span>Evidence Level: <span className="text-yellow-400">B</span></span>
                          <span>Risk Reduction: <span className="text-green-400">~15%</span></span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'population-comparison' && (
                <div>
                  <h3 className="text-xl font-bold text-white mb-4">Population Comparison</h3>

                  {/* Population Comparison Dashboard */}
                  <div className="mb-8">
                    <h4 className="text-lg font-bold text-white mb-4">Global Population Comparison</h4>

                    {/* Population Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {[
                        { population: "Northern European", region: "Scandinavia, British Isles, Germany", carrierFreq: "4.0% (1 in 25)", affectedFreq: "1 in 2,500", dF508Freq: "88%", avgAge: "45 years", longevity: 68, risk: "HIGH", color: "#ef4444" },
                        { population: "Southern European", region: "Mediterranean (Italy, Spain, Greece)", carrierFreq: "2.1% (1 in 48)", affectedFreq: "1 in 4,600", dF508Freq: "52%", avgAge: "48 years", longevity: 72, risk: "MODERATE", color: "#f59e0b" },
                        { population: "Ashkenazi Jewish", region: "Eastern Europe origin", carrierFreq: "4.0% (1 in 25)", affectedFreq: "1 in 2,500", dF508Freq: "85%", avgAge: "44 years", longevity: 67, risk: "HIGH", color: "#ef4444" },
                        { population: "East Asian", region: "China, Japan, Korea", carrierFreq: "0.04% (1 in 2,500)", affectedFreq: "1 in 90,000", dF508Freq: "15%", avgAge: "52 years", longevity: 85, risk: "LOW", color: "#10b981" },
                        { population: "African", region: "Sub-Saharan Africa", carrierFreq: "0.2% (1 in 500)", affectedFreq: "1 in 15,000", dF508Freq: "28%", avgAge: "50 years", longevity: 78, risk: "LOW", color: "#10b981" },
                        { population: "Hispanic/Latino", region: "Americas (mixed ancestry)", carrierFreq: "1.4% (1 in 71)", affectedFreq: "1 in 8,000", dF508Freq: "46%", avgAge: "47 years", longevity: 74, risk: "MODERATE", color: "#f59e0b" }
                      ].map((pop, index) => (
                        <div key={index} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                          <div className="flex justify-between items-start mb-2">
                            <h5 className="font-bold text-white">{pop.population}</h5>
                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${mapHexToVariant(pop.color).text} ${mapHexToVariant(pop.color).bgAlpha}`}>
                              {pop.risk}
                            </span>
                          </div>
                          <p className="text-sm text-slate-400">{pop.region}</p>

                          <div className="mt-3 space-y-2">
                            <div>
                              <div className="flex justify-between text-xs text-slate-400">
                                <span>Carrier Frequency</span>
                                <span className="text-white">{pop.carrierFreq}</span>
                              </div>
                              <div className="w-full bg-slate-700 rounded-full h-1.5 mt-1">
                                <div className={`${getPercentClass((parseFloat(pop.carrierFreq) > 1 ? parseFloat(pop.carrierFreq) * 10 : parseFloat(pop.carrierFreq) * 40))} ${mapHexToVariant(pop.color).bg} h-1.5 rounded-full`}></div>
                              </div>
                            </div>

                            <div>
                              <div className="flex justify-between text-xs text-slate-400">
                                <span>Affected Frequency</span>
                                <span className="text-white">{pop.affectedFreq}</span>
                              </div>
                            </div>

                            <div>
                              <div className="flex justify-between text-xs text-slate-400">
                                <span>ΔF508 Frequency</span>
                                <span className="text-white">{pop.dF508Freq}</span>
                              </div>
                            </div>

                            <div className="flex justify-between text-xs text-slate-400">
                              <span>Avg Age</span>
                              <span className="text-white">{pop.avgAge}</span>
                            </div>

                            <div className="mt-2 flex justify-between items-center">
                              <span className="text-xs text-slate-400">Longevity</span>
                              <div className="flex items-center">
                                <span className="text-white mr-2">{pop.longevity}</span>
                                <div className="w-12 h-2 bg-slate-700 rounded-full">
                                  <div className={`${getPercentClass(pop.longevity)} ${longevityBgClass(pop.longevity)} h-2 rounded-full`}></div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Comparison Chart */}
                  <div className="mb-8">
                    <h4 className="text-lg font-bold text-white mb-4">Carrier Frequency Comparison</h4>
                    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 h-64">
                      <div className="flex items-end h-full space-x-2 justify-center">
                        {[
                          { population: "Nor Eu", freq: 4.0, color: "#ef4444" },
                          { population: "S Eu", freq: 2.1, color: "#f59e0b" },
                          { population: "Ashk", freq: 4.0, color: "#ef4444" },
                          { population: "EA", freq: 0.04, color: "#10b981" },
                          { population: "Afr", freq: 0.2, color: "#10b981" },
                          { population: "Hisp", freq: 1.4, color: "#f59e0b" }
                        ].map((pop, index) => (
                          <div key={index} className="flex flex-col items-center w-[12%]">
                            <div className="text-xs text-slate-400 mb-1">{pop.population}</div>
                            <div className={`w-3/4 rounded-t ${getHeightClass(pop.freq * 10 > 1 ? pop.freq * 10 : 1)} ${mapHexToVariant(pop.color).bg}`}></div>
                            <div className="text-xs text-white mt-1">{pop.freq}%</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Variant Distribution */}
                  <div className="mb-8">
                    <h4 className="text-lg font-bold text-white mb-4">ΔF508 Variant Distribution by Population</h4>
                    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                      <div className="space-y-4">
                        {[
                          {
                            population: "Northern European",
                            distribution: [
                              { variant: "ΔF508", percentage: 88, color: "#ef4444" },
                              { variant: "G551D", percentage: 3.4, color: "#f59e0b" },
                              { variant: "G542X", percentage: 2.6, color: "#8b5cf6" },
                              { variant: "N1303K", percentage: 2.1, color: "#06b6d4" },
                              { variant: "Other", percentage: 3.9, color: "#6b7280" }
                            ]
                          },
                          {
                            population: "Southern European",
                            distribution: [
                              { variant: "ΔF508", percentage: 52, color: "#ef4444" },
                              { variant: "F508C", percentage: 2.8, color: "#f59e0b" },
                              { variant: "N1303K", percentage: 7.8, color: "#8b5cf6" },
                              { variant: "G542X", percentage: 3.2, color: "#06b6d4" },
                              { variant: "Other", percentage: 34.2, color: "#6b7280" }
                            ]
                          }
                        ].map((popData, index) => (
                          <div key={index} className="mb-4">
                            <h5 className="font-bold text-white mb-2">{popData.population}</h5>
                            <div className="w-full bg-slate-700 rounded-full h-4">
                              <div className="flex h-4 rounded-full overflow-hidden">
                                {popData.distribution.map((variant, idx) => {
                                  const variantTitle = `${variant.variant}: ${variant.percentage}%`;

                                  return (
                                    // eslint-disable-next-line react/no-unstable-nested-components
                                    <div key={idx} className={`h-full ${getPercentClass(variant.percentage)} ${mapHexToVariant(variant.color).bg}`} title={variantTitle}></div>
                                  );
                                })}
                              </div>
                            </div>
                            <div className="flex justify-between text-xs text-slate-400 mt-1">
                              {popData.distribution.map((variant, idx) => (
                                <span key={idx}>{variant.variant}</span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Ancestry Likelihood */}
                  <div>
                    <h4 className="text-lg font-bold text-white mb-4">Ancestry Composition</h4>
                    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                      <div className="flex flex-col md:flex-row justify-around items-center">
                        <div className="relative w-48 h-48 mb-4 md:mb-0">
                          <svg viewBox="0 0 100 100" className="w-full h-full">
                            {/* Northern European - 92% */}
                            <circle
                              cx="50"
                              cy="50"
                              r="45"
                              fill="none"
                              stroke="#ef4444"
                              strokeWidth="20"
                              strokeDasharray="283"
                              strokeDashoffset={283 - (283 * 92) / 100}
                              transform="rotate(-90 50 50)"
                            />
                            {/* Ashkenazi Jewish - 8% */}
                            <circle
                              cx="50"
                              cy="50"
                              r="45"
                              fill="none"
                              stroke="#f59e0b"
                              strokeWidth="20"
                              strokeDasharray="283"
                              strokeDashoffset={283 - (283 * 8) / 100}
                              transform={`rotate(${-90 + (360 * 92) / 100} 50 50)`}
                            />
                          </svg>
                          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
                            <div className="text-white font-bold">92%</div>
                            <div className="text-slate-400 text-sm">N Eur</div>
                          </div>
                        </div>

                        <div className="text-center">
                          <h5 className="font-bold text-white">Most Similar To</h5>
                          <p className="text-2xl font-bold text-scientific-blue">Northern European (92%)</p>
                          <p className="text-slate-400 text-sm mt-2">Secondary: Ashkenazi Jewish (8%)</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'variant-browser' && (
                <div>
                  <h3 className="text-xl font-bold text-white mb-4">Variant Browser</h3>
                  <div className="mb-6">
                    <h4 className="text-lg font-bold text-white mb-3">Patient Variants Overview</h4>
                    <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                          <thead className="bg-slate-950 text-slate-500 text-[10px] font-bold uppercase tracking-widest border-b border-slate-800">
                            <tr>
                              <th className="px-6 py-3">Gene</th>
                              <th className="px-6 py-3">HGVS (c)</th>
                              <th className="px-6 py-3">HGVS (p)</th>
                              <th className="px-6 py-3">Allele Freq</th>
                              <th className="px-6 py-3">Clinical Sig</th>
                              <th className="px-6 py-3">ACMG Class</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800">
                            {riskData ? (
                              <>
                                <tr className="hover:bg-slate-800/50 transition-colors">
                                  <td className="px-6 py-4 font-bold text-white">CFTR</td>
                                  <td className="px-6 py-4 font-mono text-xs text-primary">c.1521_1523delCTT</td>
                                  <td className="px-6 py-4 font-mono text-xs text-slate-300">p.Phe508del (ΔF508)</td>
                                  <td className="px-6 py-4 text-xs text-slate-400">0.004</td>
                                  <td className="px-6 py-4 text-xs">
                                    <span className="px-2 py-1 rounded text-[10px] font-bold uppercase bg-red-900/40 text-red-300">Pathogenic</span>
                                  </td>
                                  <td className="px-6 py-4 text-xs">
                                    <span className="px-2 py-1 rounded text-[10px] font-bold uppercase bg-red-800/50 text-red-200">PVS1+PM2</span>
                                  </td>
                                </tr>
                                <tr className="hover:bg-slate-800/50 transition-colors">
                                  <td className="px-6 py-4 font-bold text-white">CFTR</td>
                                  <td className="px-6 py-4 font-mono text-xs text-primary">{'c.1657C>T'}</td>
                                  <td className="px-6 py-4 font-mono text-xs text-slate-300">p.Arg553Ter</td>
                                  <td className="px-6 py-4 text-xs text-slate-400">0.002</td>
                                  <td className="px-6 py-4 text-xs">
                                    <span className="px-2 py-1 rounded text-[10px] font-bold uppercase bg-red-900/40 text-red-300">Pathogenic</span>
                                  </td>
                                  <td className="px-6 py-4 text-xs">
                                    <span className="px-2 py-1 rounded text-[10px] font-bold uppercase bg-orange-800/50 text-orange-200">PM1</span>
                                  </td>
                                </tr>
                                <tr className="hover:bg-slate-800/50 transition-colors">
                                  <td className="px-6 py-4 font-bold text-white">CFTR</td>
                                  <td className="px-6 py-4 font-mono text-xs text-primary">{'c.350G>A'}</td>
                                  <td className="px-6 py-4 font-mono text-xs text-slate-300">p.Gly117Glu</td>
                                  <td className="px-6 py-4 text-xs text-slate-400">0.001</td>
                                  <td className="px-6 py-4 text-xs">
                                    <span className="px-2 py-1 rounded text-[10px] font-bold uppercase bg-yellow-900/40 text-yellow-300">Likely Pathogenic</span>
                                  </td>
                                  <td className="px-6 py-4 text-xs">
                                    <span className="px-2 py-1 rounded text-[10px] font-bold uppercase bg-yellow-800/50 text-yellow-200">PM1+PM2</span>
                                  </td>
                                </tr>
                              </>
                            ) : (
                              <tr>
                                <td colSpan={6} className="px-6 py-8 text-center text-slate-500">No variants loaded. Select a patient and load risk profile.</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* Additional Info Sections */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                      <h4 className="font-bold text-white mb-3">Data Sources</h4>
                      <ul className="space-y-2 text-sm text-slate-300">
                        <li className="flex items-start">
                          <span className="text-scientific-blue mr-2">•</span>
                          <span><a href="https://www.ncbi.nlm.nih.gov/clinvar/" target="_blank" rel="noopener noreferrer" className="text-scientific-blue hover:underline">ClinVar (NCBI)</a></span>
                        </li>
                        <li className="flex items-start">
                          <span className="text-scientific-blue mr-2">•</span>
                          <span><a href="https://gnomad.broadinstitute.org/" target="_blank" rel="noopener noreferrer" className="text-scientific-blue hover:underline">gnomAD Database</a></span>
                        </li>
                        <li className="flex items-start">
                          <span className="text-scientific-blue mr-2">•</span>
                          <span><a href="https://www.omim.org/" target="_blank" rel="noopener noreferrer" className="text-scientific-blue hover:underline">OMIM (Online Mendelian Inheritance in Man)</a></span>
                        </li>
                        <li className="flex items-start">
                          <span className="text-scientific-blue mr-2">•</span>
                          <span><a href="https://www.ncbi.nlm.nih.gov/projects/SNP/" target="_blank" rel="noopener noreferrer" className="text-scientific-blue hover:underline">dbSNP</a></span>
                        </li>
                      </ul>
                    </div>

                    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                      <h4 className="font-bold text-white mb-3">Key Insights</h4>
                      <ul className="space-y-2 text-sm text-slate-300">
                        <li className="flex items-start">
                          <span className="text-scientific-blue mr-2">•</span>
                          <span>Your ΔF508 variant is most common in Northern European populations</span>
                        </li>
                        <li className="flex items-start">
                          <span className="text-scientific-blue mr-2">•</span>
                          <span>Your longevity score (72) is slightly above Northern European average (68)</span>
                        </li>
                        <li className="flex items-start">
                          <span className="text-scientific-blue mr-2">•</span>
                          <span>Consider genetic counseling resources specific to CFTR mutations</span>
                        </li>
                        <li className="flex items-start">
                          <span className="text-scientific-blue mr-2">•</span>
                          <span>Carrier frequency varies significantly across populations (0.04%-4.0%)</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {!riskData && !loading && patientId && (
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-12 text-center">
            <Activity className="text-slate-600 mx-auto mb-4" size={48} />
            <h3 className="text-xl font-bold text-white mb-2">Risk Profile Loaded</h3>
            <p className="text-slate-400">Select a patient and click "Load Risk Profile" to see personalized risk assessment</p>
          </div>
        )}

        {/* Data Sources & Citations Footer */}
        <div className="mt-8 pt-6 border-t border-slate-800">
          <div className="bg-slate-900/20 border border-slate-800 rounded-xl p-4">
            <h4 className="font-bold text-white mb-3 text-center">Scientific Data Sources & Citations</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-400">
              <div>
                <p><strong>1000 Genomes Project:</strong> <a href="https://www.internationalgenome.org/" target="_blank" rel="noopener noreferrer" className="text-scientific-blue hover:underline">internationalgenome.org</a></p>
                <p><strong>gnomAD Database:</strong> <a href="https://gnomad.broadinstitute.org/" target="_blank" rel="noopener noreferrer" className="text-scientific-blue hover:underline">gnomad.broadinstitute.org</a></p>
                <p><strong>ClinVar (NCBI):</strong> <a href="https://www.ncbi.nlm.nih.gov/clinvar/" target="_blank" rel="noopener noreferrer" className="text-scientific-blue hover:underline">ncbi.nlm.nih.gov/clinvar</a></p>
              </div>
              <div>
                <p><strong>Cystic Fibrosis Foundation Patient Registry</strong></p>
                <p><strong>Gabriel SE, et al. Am J Hum Genet. 1994:</strong> CFTR gene identification</p>
                <p><strong>Poolman EM, Galvani AP. Proc R Soc B. 2007:</strong> Heterozygote advantage hypothesis</p>
              </div>
            </div>
            <div className="mt-4 text-center text-xs text-slate-500">
              <p><strong>Disclaimer:</strong> For research purposes. Not for clinical diagnosis. Last Updated: {new Date().toISOString().split('T')[0]}</p>
            </div>
          </div>
        </div>

        {!patientId && !loading && !riskData && (
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-12 text-center">
            <User className="text-slate-600 mx-auto mb-4" size={48} />
            <h3 className="text-xl font-bold text-white mb-2">Select a Patient</h3>
            <p className="text-slate-400">Choose a patient from the dropdown to load their risk profile</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DiseaseTracerTab;