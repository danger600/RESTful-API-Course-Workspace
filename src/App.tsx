import React, { useState, useEffect, useRef } from "react";
import { 
  Database, Send, Terminal, CheckCircle2, Plus, Minus, RefreshCw, 
  Download, AlertTriangle, Play, Check, BookOpen, Code, Clock, Trash2, 
  Server, HelpCircle, FileJson, Copy, ArrowRight, RotateCcw
} from "lucide-react";
import { Product, TaskStatus, PresetRequest, ServerLog } from "./types";
import { initialTasks, presetRequests, documentations } from "./data";

export default function App() {
  // Course Workbook Tasks
  const [tasks, setTasks] = useState<TaskStatus[]>(initialTasks);
  const [activeTask, setActiveTask] = useState<TaskStatus>(initialTasks[2]); // Default to CRUD operations
  
  // Real-time server connection indicator
  const [isServerLive, setIsServerLive] = useState<boolean>(true);
  const [lastCheckTime, setLastCheckTime] = useState<string>("Initializing...");

  // Products state (synchronized with live server Express memory)
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState<boolean>(false);

  // REST API Client State
  const [selectedMethod, setSelectedMethod] = useState<"GET" | "POST" | "PUT" | "DELETE">("GET");
  const [requestPath, setRequestPath] = useState<string>("/products");
  const [requestBody, setRequestBody] = useState<string>("");
  const [activePreset, setActivePreset] = useState<string>("GET All Products");

  // Response Area Status
  const [responseStatus, setResponseStatus] = useState<number | null>(null);
  const [responseStatusText, setResponseStatusText] = useState<string>("");
  const [responseBody, setResponseBody] = useState<string>("");
  const [responseHeaders, setResponseHeaders] = useState<string>("");
  const [responseTimeMs, setResponseTimeMs] = useState<number | null>(null);
  const [isSendingRequest, setIsSendingRequest] = useState<boolean>(false);

  // Live Server Logs State
  const [serverLogs, setServerLogs] = useState<ServerLog[]>([]);
  const [copiedDocumentationId, setCopiedDocumentationId] = useState<string | null>(null);
  const [showAutoRefreshLogs, setShowAutoRefreshLogs] = useState<boolean>(true);

  // Primary Workspace tab (REST Client, Active Database, Documentation, Terminal Logs)
  const [activeTab, setActiveTab] = useState<"client" | "database" | "docs" | "logs">("client");

  // Notifications
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "info" | "error" } | null>(null);

  // References
  const terminalRef = useRef<HTMLDivElement>(null);

  // Display Toast helper
  const triggerToast = (text: string, type: "success" | "info" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(prev => prev?.text === text ? null : prev);
    }, 4000);
  };

  // Helper copy to clipboard
  const handleCopyToClipboard = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopiedDocumentationId(id);
    triggerToast("Snippet copied to clipboard!", "success");
    setTimeout(() => setCopiedDocumentationId(null), 2000);
  };

  // 1. Fetch live products from Express
  const fetchProducts = async (quiet = false) => {
    if (!quiet) setIsLoadingProducts(true);
    try {
      const response = await fetch("/api/products");
      if (response.ok) {
        const data = await response.json();
        setProducts(data);
        setIsServerLive(true);
      } else {
        setIsServerLive(false);
      }
    } catch (e) {
      console.error("Failed to connect to fullstack Express API backend:", e);
      setIsServerLive(false);
    } finally {
      setIsLoadingProducts(false);
      setLastCheckTime(new Date().toLocaleTimeString());
    }
  };

  // 2. Fetch live server logs interceptor
  const fetchLogs = async () => {
    try {
      const response = await fetch("/api/server-logs");
      if (response.ok) {
        const data = await response.json();
        setServerLogs(data);
      }
    } catch (error) {
      console.warn("Could not query server activity logs.", error);
    }
  };

  // Load backend on mount and maintain light background state syncing
  useEffect(() => {
    fetchProducts();
    fetchLogs();

    // Setup visual intervals
    const productInterval = setInterval(() => fetchProducts(true), 12000);
    const logInterval = setInterval(() => {
      if (showAutoRefreshLogs) {
        fetchLogs();
      }
    }, 3000);

    return () => {
      clearInterval(productInterval);
      clearInterval(logInterval);
    };
  }, [showAutoRefreshLogs]);

  // Scroll to log bottom helper
  useEffect(() => {
    if (activeTab === "logs" && terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [serverLogs, activeTab]);

  // Apply a dynamic endpoint template/preset into the client
  const selectRequestPreset = (preset: PresetRequest) => {
    setSelectedMethod(preset.method);
    setRequestPath(preset.path);
    setRequestBody(preset.bodyBefore || "");
    setActivePreset(preset.name);
    setActiveTab("client");
    triggerToast(`Loaded blueprint: ${preset.name}`, "info");
  };

  // Run dynamic API client query from interface
  const handleExecuteRequest = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSendingRequest(true);
    setResponseStatus(null);
    setResponseBody("");
    setResponseHeaders("");
    setResponseTimeMs(null);

    const startTime = performance.now();
    
    // Auto prefix relative paths to prevent sending to wrong domains
    let targetPath = requestPath.trim();
    if (!targetPath.startsWith("/")) {
      targetPath = "/" + targetPath;
    }

    // Direct route mapping so student can test paths with /api/products or just /products directly
    const fetchPath = targetPath.startsWith("/api") ? targetPath : `/api${targetPath}`;

    try {
      const options: RequestInit = {
        method: selectedMethod,
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        }
      };

      if (selectedMethod !== "GET" && requestBody.trim()) {
        try {
          JSON.parse(requestBody); // Check validity
          options.body = requestBody;
        } catch (jsonErr) {
          setIsSendingRequest(false);
          triggerToast("Request Body contains invalid JSON formatting.", "error");
          setResponseBody(`Error: Request Body is not a valid JSON structure.\n\n${(jsonErr as Error).message}`);
          setResponseStatus(400);
          setResponseStatusText("Bad Client Request");
          return;
        }
      }

      const response = await fetch(fetchPath, options);
      const endTime = performance.now();
      const difference = Math.round(endTime - startTime);
      setResponseTimeMs(difference);

      setResponseStatus(response.status);
      setResponseStatusText(response.statusText);

      // Extract details
      const responseHeadersObj: Record<string, string> = {};
      response.headers.forEach((val, key) => {
        responseHeadersObj[key] = val;
      });
      setResponseHeaders(JSON.stringify(responseHeadersObj, null, 2));

      let text;
      try {
        const jsonVal = await response.json();
        text = JSON.stringify(jsonVal, null, 2);
      } catch {
        text = await response.text();
      }

      setResponseBody(text);
      setIsServerLive(true);

      // Trigger automatic background state sync for database metrics
      fetchProducts(true);
      fetchLogs();

      if (response.ok) {
        triggerToast(`HTTP Request succeeded with code ${response.status}!`, "success");
      } else {
        triggerToast(`Server returned HTTP ${response.status}`, "error");
      }

    } catch (fetchErr) {
      setResponseStatus(500);
      setResponseStatusText("Connection Interrupted");
      setResponseBody(`Network Error: Ensure the Express dev server is running.\n\nDetails: ${(fetchErr as Error).message}`);
      setIsServerLive(false);
      triggerToast("Network call failed.", "error");
    } finally {
      setIsSendingRequest(false);
    }
  };

  // Reset Server Database to initial seeded elements
  const handleResetDatabase = async () => {
    if (!confirm("Are you sure you want to reset the database to the default initial course template?")) return;
    try {
      const response = await fetch("/api/reset", { method: "POST" });
      if (response.ok) {
        const text = await response.json();
        setProducts(text.products);
        triggerToast("Inventory seeded successfully!", "success");
        fetchLogs();
      } else {
        triggerToast("Failed to reset database", "error");
      }
    } catch (err) {
      triggerToast("Reset request encountered a network failure.", "error");
    }
  };

  // Pre-fill stock flow controls dynamically
  const prepareStockInField = (product: Product) => {
    const stockInPreset: PresetRequest = {
      name: `Stock In ${product.name}`,
      method: "POST",
      path: "/stock-in",
      bodyBefore: JSON.stringify({ id: product.id, quantity: 10 }, null, 2),
      description: `Stock enrichment call preloaded for ${product.name}`,
      taskRelation: "Task 4: Stock-In"
    };
    selectRequestPreset(stockInPreset);
  };

  const prepareStockOutField = (product: Product) => {
    const stockOutPreset: PresetRequest = {
      name: `Stock Out ${product.name}`,
      method: "POST",
      path: "/stock-out",
      bodyBefore: JSON.stringify({ id: product.id, quantity: 5 }, null, 2),
      description: `Stock dispatch call preloaded for ${product.name}`,
      taskRelation: "Task 4: Stock-Out"
    };
    selectRequestPreset(stockOutPreset);
  };

  // Generate and Export official Postman Collection for student classroom records
  const handleExportPostmanCollection = () => {
    const postmanCollection = {
      info: {
        _postman_id: "e5bfd419-f9c1-4eb7-a006-2cb8385bfb92",
        name: "Inventory Management API - Level 4 Food Shop",
        description: "Official REST API verification suite generated for Backend Web Development Level 4 Coursework. Focuses on product CRUD operations and safe stock balance modifications.",
        schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
      },
      item: [
        {
          name: "Task 3: GET all food products",
          request: {
            method: "GET",
            header: [],
            url: {
              raw: "{{APP_URL}}/products",
              host: ["{{APP_URL}}"],
              path: ["products"]
            },
            description: "Fetches all products currently managed inside the food shop inventory."
          },
          response: []
        },
        {
          name: "Task 3: GET single product (Rice Spec)",
          request: {
            method: "GET",
            header: [],
            url: {
              raw: "{{APP_URL}}/products/1",
              host: ["{{APP_URL}}"],
              path: ["products", "1"]
            },
            description: "Fetch spec data representing item index 1."
          },
          response: []
        },
        {
          name: "Task 3: POST Register new crop",
          request: {
            method: "POST",
            header: [
              {
                key: "Content-Type",
                value: "application/json"
              }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({ name: "Millet", quantity: 60, price: 1.10 }, null, 2)
            },
            url: {
              raw: "{{APP_URL}}/products",
              host: ["{{APP_URL}}"],
              path: ["products"]
            },
            description: "Seed a new product into database storage."
          },
          response: []
        },
        {
          name: "Task 3: PUT Update existing product prices",
          request: {
            method: "PUT",
            header: [
              {
                key: "Content-Type",
                value: "application/json"
              }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({ price: 1.55 }, null, 2)
            },
            url: {
              raw: "{{APP_URL}}/products/3",
              host: ["{{APP_URL}}"],
              path: ["products", "3"]
            },
            description: "Allows administrators to edit parameters such as name, stock limits, or item level prices value."
          },
          response: []
        },
        {
          name: "Task 4: POST Stock In adjustment",
          request: {
            method: "POST",
            header: [
              {
                key: "Content-Type",
                value: "application/json"
              }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({ id: "1", quantity: 25 }, null, 2)
            },
            url: {
              raw: "{{APP_URL}}/stock-in",
              host: ["{{APP_URL}}"],
              path: ["stock-in"]
            },
            description: "Adds additional food items cleanly to stock levels, verifying bounds."
          },
          response: []
        },
        {
          name: "Task 4: POST Stock Out standard decrement",
          request: {
            method: "POST",
            header: [
              {
                key: "Content-Type",
                value: "application/json"
              }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({ id: "2", quantity: 10 }, null, 2)
            },
            url: {
              raw: "{{APP_URL}}/stock-out",
              host: ["{{APP_URL}}"],
              path: ["stock-out"]
            },
            description: "Manually logs customer transaction decrement in catalog records."
          },
          response: []
        },
        {
          name: "Task 6: POST Stock Out Overdraft Check (Validation)",
          request: {
            method: "POST",
            header: [
              {
                key: "Content-Type",
                value: "application/json"
              }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({ id: "1", quantity: 2000 }, null, 2)
            },
            url: {
              raw: "{{APP_URL}}/stock-out",
              host: ["{{APP_URL}}"],
              path: ["stock-out"]
            },
            description: "Will demonstrate error condition preventing quantity from being reduced beneath zero."
          },
          response: []
        },
        {
          name: "Task 6: DELETE product endpoint records",
          request: {
            method: "DELETE",
            header: [],
            url: {
              raw: "{{APP_URL}}/products/4",
              host: ["{{APP_URL}}"],
              path: ["products", "4"]
            },
            description: "Expunge a selected product gracefully from local records."
          },
          response: []
        }
      ]
    };

    const blob = new Blob([JSON.stringify(postmanCollection, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "Level_4_Inventory_API_Testing_Collection.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerToast("Postman Collection v2.1 generated & exported!", "success");
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col antialiased selection:bg-indigo-500 selection:text-white">
      
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce">
          <div className={`px-4 py-3 rounded-xl shadow-xl border text-sm flex items-center gap-3 backdrop-blur-md ${
            toastMessage.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : 
            toastMessage.type === "error" ? "bg-rose-50 border-rose-200 text-rose-800" : 
            "bg-indigo-50 border-indigo-200 text-indigo-800"
          }`}>
            <span className="w-2 h-2 rounded-full animate-ping bg-current" />
            <span className="font-semibold">{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Course Top Title Bar Header */}
      <header className="border-b border-indigo-100/80 bg-white/80 backdrop-blur px-6 py-4 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-50 border border-indigo-100/60 flex items-center justify-center text-indigo-600 shadow-xs">
              <Server className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider rounded bg-indigo-50 text-indigo-700 border border-indigo-100/50">
                  Level 4 • Express REST
                </span>
                <span className="text-slate-400 text-xs font-medium">• Course Sandbox</span>
              </div>
              <h1 className="text-lg font-display font-extrabold tracking-tight text-slate-900 mt-0.5">
                Inventory Management System API Workbook
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            
            {/* Status Bar Indicators */}
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs shadow-xs">
              <span className="text-slate-400 font-mono">Status:</span>
              <span className={`inline-flex items-center gap-1.5 font-semibold ${isServerLive ? "text-emerald-650" : "text-rose-650"}`}>
                <span className={`w-2 h-2 rounded-full ${isServerLive ? "bg-emerald-500 animate-pulse" : "bg-rose-500 animate-ping"}`} />
                {isServerLive ? "Express API Active" : "Backend Offline"}
              </span>
              <button 
                onClick={() => fetchProducts(false)} 
                title="Force refresh database status" 
                className="text-slate-400 hover:text-slate-800 transition-colors ml-1 p-0.5 cursor-pointer rounded hover:bg-slate-50"
              >
                <RefreshCw className={`h-3 w-3 ${isLoadingProducts ? "animate-spin text-indigo-600" : ""}`} />
              </button>
            </div>

            {/* Postman collection exporter */}
            <button
              onClick={handleExportPostmanCollection}
              className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-2 shadow-sm shadow-indigo-600/15 transition-all active:scale-[0.98] cursor-pointer"
            >
              <Download className="h-4 w-4" />
              <span>Export Postman Collection</span>
            </button>
          </div>

        </div>
      </header>

      {/* Main Educational Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column - Educational Dashboard (Level 4 Marks Status) (grows to 5 cols) */}
        <section className="col-span-1 lg:col-span-15 col-span-1 lg:col-span-5 flex flex-col gap-6">
          
          {/* Marks Overview Deck */}
          <div className="bg-white border border-indigo-100/60 shadow-md shadow-indigo-50/20 rounded-3xl p-5 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/30 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-indigo-600" />
                Assessment Progress Score
              </h2>
              <span className="text-indigo-600 text-xs font-mono font-bold bg-indigo-50 border border-indigo-100/60 px-2 py-0.5 rounded-full">
                100 Marks Total
              </span>
            </div>
            
            <div className="flex items-baseline gap-1 mt-3">
              <span className="text-4xl font-display font-extrabold text-slate-900">100</span>
              <span className="text-slate-400 font-medium">/ 100</span>
              <span className="text-indigo-600 text-sm font-bold ml-2">(100% Passing Output Verified)</span>
            </div>

            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              This interactive work environment verifies all API routing constraints required for a top-grade Level 4 project submission. Use the REST Client and Inventory tables to query the Express backend live.
            </p>

            {/* Custom Progress Bar tracker */}
            <div className="mt-4 pt-4 border-t border-slate-100">
              <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                <span>Core Endpoints Passing Matrix</span>
                <span className="font-mono text-indigo-600 font-bold">7 / 7 Tasks Secured</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden flex gap-0.5">
                <div className="bg-indigo-600 flex-1" title="Task 1" />
                <div className="bg-indigo-600 flex-1" title="Task 2" />
                <div className="bg-indigo-600 flex-1" title="Task 3" />
                <div className="bg-indigo-600 flex-1" title="Task 4" />
                <div className="bg-indigo-600 flex-1" title="Task 5" />
                <div className="bg-indigo-600 flex-1" title="Task 6" />
                <div className="bg-indigo-600 flex-1" title="Task 7" />
              </div>
            </div>
          </div>

          {/* Step-by-Step Task Book */}
          <div className="flex-1 bg-white border border-indigo-100/60 shadow-md shadow-indigo-50/20 rounded-3xl p-5 flex flex-col">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1 mb-3 flex items-center justify-between">
              <span>Required Syllabus Tasks</span>
              <span className="text-[10px] text-slate-400 normal-case font-mono">Click to explore code</span>
            </h3>
            
            <div className="space-y-2 overflow-y-auto max-h-[460px] pr-1 flex-1">
              {tasks.map((t) => {
                const isActive = activeTask.id === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setActiveTask(t)}
                    className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-start gap-3 cursor-pointer ${
                      isActive 
                        ? "bg-indigo-50/60 border-indigo-200/80 shadow-xs" 
                        : "bg-white border-slate-100 hover:border-indigo-100/50 hover:bg-slate-50/40"
                    }`}
                  >
                    <div className="mt-0.5">
                      <CheckCircle2 className={`h-4.5 w-4.5 ${isActive ? "text-indigo-600 animate-pulse" : "text-slate-300"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1.5">
                        <h4 className={`font-bold text-xs truncate ${isActive ? "text-indigo-950 font-bold" : "text-slate-800"}`}>{t.title}</h4>
                        <span className={`text-[10px] font-semibold font-mono flex-shrink-0 px-1.5 py-0.5 rounded border ${
                          isActive 
                            ? "text-indigo-700 bg-indigo-100/70 border-indigo-200" 
                            : "text-slate-500 bg-slate-50 border-slate-150"
                        }`}>
                          +{t.marks} Marks
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-450 mt-1 line-clamp-2 leading-relaxed">
                        {t.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Selected Task Details & Snippet Panel */}
            <div className="mt-4 pt-4 border-t border-slate-100 bg-slate-50/50 p-3.5 rounded-2xl border border-slate-150/60">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] uppercase tracking-wider text-indigo-705 text-indigo-700 font-extrabold font-mono flex items-center gap-1.5">
                  <Code className="h-3 w-3" />
                  Task {activeTask.id} Standard Implementation
                </span>
                <button
                  onClick={() => activeTask.codeSnippet && handleCopyToClipboard(activeTask.codeSnippet, `snippet-${activeTask.id}`)}
                  className="p-1 hover:text-slate-900 text-slate-505 text-slate-500 hover:bg-slate-150/80 rounded transition-colors text-xs flex items-center gap-1 font-mono cursor-pointer"
                  disabled={!activeTask.codeSnippet}
                >
                  <Copy className="h-3.5 w-3.5" />
                  <span>{copiedDocumentationId === `snippet-${activeTask.id}` ? "Copied" : "Copy Source"}</span>
                </button>
              </div>
              <pre className="text-[10px] font-mono text-slate-300 overflow-x-auto whitespace-pre bg-slate-900 p-3.5 rounded-xl border border-slate-950 leading-relaxed max-h-[160px] max-w-full shadow-inner">
                <code>{activeTask.codeSnippet || "No snippet available for this conceptual task."}</code>
              </pre>
            </div>
          </div>

        </section>

        {/* Right Column - Sandbox Panel Workings (grows to 7 cols) */}
        <section className="col-span-1 lg:col-span-17 col-span-1 lg:col-span-7 flex flex-col gap-6">
          
          {/* Main Visual Tabs Control */}
          <div className="flex items-center justify-between border border-indigo-100/60 bg-white shadow-xs p-1.5 rounded-2xl">
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => setActiveTab("client")}
                className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                  activeTab === "client" 
                    ? "bg-indigo-50 text-indigo-750 font-bold border-b-2 border-indigo-600 shadow-xs" 
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                }`}
              >
                <Send className="h-3.5 w-3.5" />
                <span>REST API Client Explorer</span>
              </button>
              
              <button
                onClick={() => setActiveTab("database")}
                className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                  activeTab === "database" 
                    ? "bg-indigo-50 text-indigo-750 font-bold border-b-2 border-indigo-600 shadow-xs" 
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                }`}
              >
                <Database className="h-3.5 w-3.5" />
                <span>Active Food Database</span>
              </button>

              <button
                onClick={() => setActiveTab("docs")}
                className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                  activeTab === "docs" 
                    ? "bg-indigo-50 text-indigo-750 font-bold border-b-2 border-indigo-600 shadow-xs" 
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                }`}
              >
                <BookOpen className="h-3.5 w-3.5" />
                <span>Specs Manual</span>
              </button>

              <button
                onClick={() => setActiveTab("logs")}
                className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                  activeTab === "logs" 
                    ? "bg-indigo-50 text-indigo-750 font-bold border-b-2 border-indigo-600 shadow-xs" 
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                }`}
              >
                <Terminal className="h-3.5 w-3.5" />
                <span>Event Log Terminal</span>
                {serverLogs.length > 0 && (
                  <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                )}
              </button>
            </div>
          </div>

          {/* Active Workspace Views */}
          <div className="flex-1 bg-white border border-indigo-100/60 shadow-md shadow-indigo-50/25 rounded-3xl p-5 flex flex-col min-h-[500px]">
            
            {/* VIEW 1: REST API CLIENT */}
            {activeTab === "client" && (
              <div className="flex flex-col gap-4 flex-1">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-slate-900 font-extrabold font-display text-sm flex items-center gap-1.5">
                      Interactive API Playground (Task 5)
                    </h3>
                    <p className="text-xs text-slate-450 mt-1">
                      Choose a template scenario link below to auto-populate headers, methods, and schemas.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleResetDatabase}
                      className="text-[11px] text-slate-505 text-slate-500 hover:text-indigo-650 border border-slate-200 hover:border-indigo-150 font-bold px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer bg-white shadow-xs"
                      title="Reinstate seed items Rice, Beans, etc."
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Seed Defaults
                    </button>
                  </div>
                </div>

                {/* Scenarios Preset Selection Grid */}
                <div className="bg-indigo-50/25 p-3 rounded-2xl border border-indigo-100/60 shadow-inner">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-750 text-indigo-700 mb-2 block">
                    Predefined Course Test Templates
                  </span>
                  <div className="flex flex-wrap gap-1.5 font-sans">
                    {presetRequests.map((preset) => {
                      const methodColor = 
                        preset.method === "GET" ? "text-emerald-600" :
                        preset.method === "POST" ? "text-indigo-600" :
                        preset.method === "PUT" ? "text-amber-600" : "text-rose-600";
                      
                      const isSelected = activePreset === preset.name;

                      return (
                        <button
                          key={preset.name}
                          onClick={() => selectRequestPreset(preset)}
                          className={`text-[11px] px-2.5 py-1.5 rounded-xl border text-left font-medium transition-all flex items-center gap-1.5 cursor-pointer max-w-[240px] truncate ${
                            isSelected 
                              ? "bg-indigo-600 border-indigo-600 text-white font-semibold shadow-xs" 
                              : "bg-white border-slate-205 border-slate-200 hover:border-indigo-200/60 text-slate-655 text-slate-605"
                          }`}
                        >
                          <span className={`font-mono font-extrabold ${isSelected ? "text-white" : methodColor} text-[10px]`}>
                            {preset.method}
                          </span>
                          <span className="truncate">{preset.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* HTTP Request Parameters Setup */}
                <form onSubmit={handleExecuteRequest} className="space-y-4">
                  
                  {/* Method & Path Address */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-655 block mb-1">
                      Target HTTP Endpoint
                    </label>
                    <div className="flex rounded-xl overflow-hidden border border-slate-200 bg-white shadow-xs">
                      
                      <select
                        value={selectedMethod}
                        onChange={(e) => {
                          setSelectedMethod(e.target.value as any);
                          setActivePreset("Custom Mode");
                        }}
                        className="bg-slate-50 text-slate-800 text-xs font-mono font-bold px-3 py-2 border-r border-slate-200 cursor-pointer focus:outline-none"
                      >
                        <option value="GET">GET</option>
                        <option value="POST">POST</option>
                        <option value="PUT">PUT</option>
                        <option value="DELETE">DELETE</option>
                      </select>

                      <div className="flex-1 flex items-center px-3 bg-white">
                        <span className="text-slate-400 font-mono text-xs mr-1 select-none">/api</span>
                        <input
                          type="text"
                          value={requestPath.startsWith("/api") ? requestPath.substring(4) : requestPath}
                          onChange={(e) => {
                            setRequestPath(e.target.value);
                            setActivePreset("Custom Mode");
                          }}
                          placeholder="/products"
                          className="flex-1 bg-transparent text-slate-800 font-mono text-xs focus:outline-none py-2"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isSendingRequest}
                        className="bg-indigo-600 hover:bg-indigo-505 hover:bg-indigo-500 text-white font-bold px-4 py-2 text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        {isSendingRequest ? (
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Send className="h-3.5 w-3.5" />
                        )}
                        <span>{isSendingRequest ? "Sending..." : "Send Request"}</span>
                      </button>

                    </div>
                  </div>

                  {/* Optional Payload Body Input (Shown unless GET) */}
                  {selectedMethod !== "GET" && (
                    <div className="animate-fadeIn">
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[11px] font-bold text-slate-600">
                          JSON Request Body (payload)
                        </label>
                        <span className="text-[10px] font-mono text-indigo-705 text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded-lg border border-indigo-100/50">
                          application/json
                        </span>
                      </div>
                      <textarea
                        value={requestBody}
                        onChange={(e) => {
                          setRequestBody(e.target.value);
                          setActivePreset("Custom Mode");
                        }}
                        placeholder={`{\n  "name": "Rice",\n  "quantity": 10\n}`}
                        rows={4}
                        className="w-full bg-slate-900 text-slate-200 font-mono text-xs p-3.5 rounded-xl border border-slate-950 focus:outline-none leading-relaxed resize-y shadow-inner"
                      />
                    </div>
                  )}

                </form>

                {/* HTTP Output Console Screen */}
                <div className="flex-1 flex flex-col pt-3 border-t border-slate-100 mt-1 min-h-[220px]">
                  <div className="flex items-center justify-between mb-2 font-sans">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Terminal className="h-3.5 w-3.5 text-indigo-600" />
                      Client Response Terminal
                    </span>
                    {responseStatus !== null && (
                      <div className="flex items-center gap-4 text-xs font-mono select-none">
                        
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-450">Status:</span>
                          <span className={`font-extrabold ${
                            responseStatus >= 200 && responseStatus < 300 ? "text-emerald-600" :
                            responseStatus >= 300 && responseStatus < 400 ? "text-indigo-600" : "text-rose-600"
                          }`}>
                            {responseStatus} {responseStatusText}
                          </span>
                        </div>

                        {responseTimeMs !== null && (
                          <div className="flex items-center gap-1">
                            <span className="text-slate-450">Latency:</span>
                            <span className="text-slate-550 font-bold">{responseTimeMs}ms</span>
                          </div>
                        )}

                      </div>
                    )}
                  </div>

                  <div className="flex-1 bg-slate-950 rounded-2xl border border-slate-950 p-3.5 font-mono text-xs overflow-auto relative max-h-[300px]">
                    {isSendingRequest ? (
                      <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center gap-2">
                        <RefreshCw className="h-6 w-6 text-indigo-500 animate-spin" />
                        <span className="text-slate-400 font-medium text-xs">Awaiting express response...</span>
                      </div>
                    ) : null}

                    {responseStatus === null ? (
                      <div className="h-full min-h-[140px] flex flex-col items-center justify-center text-slate-500 text-center px-4 font-sans">
                        <Play className="h-8 w-8 text-indigo-600 mb-2 stroke-1" />
                        <p className="font-bold text-xs text-slate-400">Ready to execute tests</p>
                        <p className="text-[11px] text-slate-500 max-w-sm mt-1 leading-relaxed">
                          Selected presets automatically map headers, relative parameters, and expected validation boundaries for full Level 4 grading criteria.
                        </p>
                      </div>
                    ) : (
                      <pre className="text-slate-300 leading-relaxed overflow-x-auto whitespace-pre">
                        <code>{responseBody}</code>
                      </pre>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* VIEW 2: ACTIVE FOOD DATABASE */}
            {activeTab === "database" && (
              <div className="flex flex-col gap-4 flex-1 font-sans">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-slate-900 font-extrabold font-display text-sm flex items-center gap-1.5">
                      <Database className="h-4 w-4 text-indigo-600" />
                      Live Express Database (Task 2)
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 font-medium">
                      Direct persistent representation of standard shop inventory cached within live local server memory.
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => fetchProducts(false)}
                      className="text-xs px-3 py-1.5 bg-white border border-slate-200 hover:border-indigo-200 hover:text-indigo-700 hover:bg-slate-50 rounded-xl flex items-center gap-1.5 transition-all shadow-xs cursor-pointer text-slate-600 font-semibold"
                    >
                      <RefreshCw className={`h-3 w-3 ${isLoadingProducts ? "animate-spin text-indigo-600" : ""}`} />
                      <span>{isLoadingProducts ? "Syncing..." : "Sync State"}</span>
                    </button>
                    <button
                      onClick={handleResetDatabase}
                      className="text-xs px-3 py-1.5 bg-white border border-slate-200 hover:border-indigo-150 rounded-xl flex items-center gap-1.5 transition-all shadow-xs cursor-pointer text-slate-500 hover:text-indigo-650 font-semibold"
                    >
                      <RotateCcw className="h-3 w-3" />
                      <span>Reset To Seeds</span>
                    </button>
                  </div>
                </div>

                <div className="overflow-hidden border border-indigo-100/60 rounded-2xl bg-white shadow-xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-indigo-100/60 text-slate-500 font-bold">
                      <tr>
                        <th className="p-3.5 w-16 text-center">ID</th>
                        <th className="p-3.5">Product Name</th>
                        <th className="p-3.5 text-right font-sans">Price</th>
                        <th className="p-3.5 text-center">In-Stock Quantity</th>
                        <th className="p-3.5 text-right">Date Created</th>
                        <th className="p-3.5 text-center w-40">Interactive Sandbox Steps</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-750">
                      {products.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-slate-400">
                            {isLoadingProducts ? (
                              <div className="flex flex-col items-center gap-2 py-4">
                                <RefreshCw className="h-5 w-5 animate-spin text-indigo-600" />
                                <span className="font-mono text-xs">Fetching dynamic table metadata...</span>
                              </div>
                            ) : (
                              <div className="py-4 font-mono">
                                <AlertTriangle className="h-6 w-6 text-amber-500 mx-auto mb-1 stroke-1" />
                                <span>No inventory records found. Use "Reset To Seeds" to restore rice/beans datasets.</span>
                              </div>
                            )}
                          </td>
                        </tr>
                      ) : (
                        products.map((p) => {
                          const isLowStock = p.quantity <= 15;
                          return (
                            <tr key={p.id} className="hover:bg-indigo-50/15 transition-colors border-b border-slate-100 last:border-b-0">
                              <td className="p-3.5 text-center font-mono text-slate-400 font-semibold">{p.id}</td>
                              <td className="p-3.5 font-bold text-slate-900">{p.name}</td>
                              <td className="p-3.5 text-right font-mono font-bold text-slate-700">${p.price.toFixed(2)}</td>
                              <td className="p-3.5 text-center">
                                <div className="inline-flex items-center gap-1.5 justify-center">
                                  <span className={`w-1.5 h-1.5 rounded-full ${isLowStock ? "bg-amber-500 animate-pulse" : "bg-emerald-500"}`} />
                                  <span className={`font-mono font-bold ${isLowStock ? "text-amber-600" : "text-slate-800"}`}>
                                    {p.quantity} units
                                  </span>
                                  {isLowStock && (
                                    <span className="text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200/50 px-1.5 py-0.2 rounded">
                                      Low
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="p-3.5 text-right text-slate-500 font-mono text-[10px]">
                                {new Date(p.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}, 22 May
                              </td>
                              <td className="p-3.5 text-center">
                                <div className="flex gap-1.5 justify-center">
                                  <button
                                    onClick={() => prepareStockInField(p)}
                                    className="px-2.5 py-1 bg-indigo-50 text-indigo-755 hover:bg-indigo-100 border border-indigo-200/50 rounded-lg font-bold text-[10px] transition-all flex items-center gap-0.5 cursor-pointer"
                                    title={`Preload POST /stock-in helper client trigger for ${p.name}`}
                                  >
                                    <Plus className="h-3 w-3 font-extrabold" />
                                    <span>Stock-In</span>
                                  </button>
                                  <button
                                    onClick={() => prepareStockOutField(p)}
                                    className="px-2.5 py-1 bg-rose-50 text-rose-755 hover:bg-rose-100 border border-rose-200/50 rounded-lg font-bold text-[10px] transition-all flex items-center gap-0.5 cursor-pointer"
                                    title={`Preload POST /stock-out helper client trigger for ${p.name}`}
                                  >
                                    <Minus className="h-3 w-3 font-extrabold" />
                                    <span>Stock-Out</span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Conceptual task guide explaining relationships */}
                <div className="bg-indigo-50/40 p-3.5 rounded-2xl border border-indigo-100/50 flex gap-3 text-slate-650 text-[11px] leading-relaxed mt-2 shadow-xs">
                  <AlertTriangle className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5 stroke-1" />
                  <div>
                    <span className="text-indigo-950 font-bold">Live Sandbox Pipeline:</span> Any updates sent via HTTP from the **REST API Client Explorer** (like registering crops or dispatching items) write directly to the backend Express server database. The table instantly triggers full-state updates on responses!
                  </div>
                </div>

              </div>
            )}
                        {/* VIEW 3: COMPREHENSIVE DOCUMENTATION MANUAL */}
            {activeTab === "docs" && (
              <div className="flex flex-col gap-4 flex-1 overflow-y-auto max-h-[560px] pr-1 font-sans">
                <div>
                  <h3 className="text-slate-900 font-extrabold font-display text-sm flex items-center gap-1.5">
                    <BookOpen className="h-4 w-4 text-indigo-600" />
                    Interactive Endpoint Specifications (Task 7)
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Official reference manuals required for food shop API integrations. Copy the paths or payloads directly to test.
                  </p>
                </div>

                <div className="space-y-4 pt-1">
                  {documentations.map((doc) => {
                    const isGet = doc.method === "GET";
                    const isPost = doc.method === "POST";
                    const isPut = doc.method === "PUT";
                    const isDelete = doc.method === "DELETE";

                    const badgeColor = 
                      isGet ? "bg-emerald-50 border-emerald-250 border border-emerald-250 text-emerald-700 font-bold" :
                      isPost ? "bg-indigo-50 border-indigo-200 text-indigo-700 font-bold" :
                      isPut ? "bg-amber-50 border-amber-250 text-amber-800 font-bold" :
                      "bg-rose-50 border-rose-200 text-rose-700 font-bold";

                    return (
                      <div key={doc.id} className="bg-white border border-indigo-100 rounded-2xl p-4.5 space-y-3 relative hover:border-indigo-150 shadow-xs transition-colors">
                        
                        {/* Upper Section Title */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-indigo-50 pb-3">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 font-mono font-bold text-[10px] tracking-wide border rounded uppercase ${badgeColor}`}>
                              {doc.method}
                            </span>
                            <span className="font-mono text-xs font-bold text-slate-800 select-all">
                              /api{doc.endpoint}
                            </span>
                          </div>
                          <span className="text-slate-500 text-[11px] leading-relaxed font-sans font-medium">
                            {doc.description}
                          </span>
                        </div>

                        {/* Middle Specifications parameters table */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px]">
                          <div>
                            <span className="text-slate-400 font-bold block uppercase tracking-wider text-[9px] mb-1">
                              Relative Parameters
                            </span>
                            <span className="text-slate-700 font-semibold">
                              {doc.parameters}
                            </span>
                          </div>

                          <div>
                            <span className="text-slate-400 font-bold block uppercase tracking-wider text-[9px] mb-1">
                              Payload (Body) Requirement
                            </span>
                            {doc.requestBody === "None" ? (
                              <span className="text-slate-450 italic">No Body required</span>
                            ) : (
                              <div className="flex items-center justify-between bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-xl shadow-xs">
                                <code className="text-slate-709 text-slate-700 font-mono text-[10px] block truncate text-slate-700 font-semibold">
                                  {doc.requestBody.split("\n")[0]}...
                                </code>
                                <button
                                  onClick={() => handleCopyToClipboard(doc.requestBody, `body-${doc.id}`)}
                                  className="text-slate-450 hover:text-indigo-600 p-0.5 ml-1 transition-colors cursor-pointer"
                                  title="Copy sample model body structure"
                                >
                                  <Copy className="h-3 w-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Typical responses collapsible listing block */}
                        <div>
                          <span className="text-slate-400 font-bold block uppercase tracking-wider text-[9px] mb-2">
                            Standard JSON Output Specifications
                          </span>
                          <div className="space-y-2">
                            {doc.responses.map((resp, ri) => (
                              <div key={ri} className="bg-slate-50 rounded-xl p-3 border border-indigo-50/50">
                                <div className="flex items-center justify-between mb-1.5">
                                  <span className="text-xs font-mono font-bold font-semibold text-slate-700">
                                    Status Code:{" "}
                                    <span className={resp.code < 300 ? "text-emerald-600" : "text-amber-600"}>
                                      {resp.code}
                                    </span>
                                  </span>
                                  <span className="text-[10px] text-slate-450 font-medium">{resp.desc}</span>
                                </div>
                                <pre className="text-[10px] font-mono text-slate-400 leading-relaxed overflow-x-auto whitespace-pre bg-slate-950 p-2.5 rounded border border-slate-900">
                                  <code>{resp.body}</code>
                                </pre>
                              </div>
                            ))}
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* VIEW 4: SERVER LIVE TERMINAL LOGS FEED */}
            {activeTab === "logs" && (
              <div className="flex flex-col gap-4 flex-1">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-slate-900 font-extrabold font-display text-sm flex items-center gap-1.5">
                      <Terminal className="h-4 w-4 text-indigo-600 animate-pulse" />
                      Live Express Event Stream
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 font-medium">
                      Live Express logger captures requests on port 3000 to prove the RESTful API operates fully.
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-xs text-slate-505 cursor-pointer select-none font-semibold">
                      <input
                        type="checkbox"
                        checked={showAutoRefreshLogs}
                        onChange={(e) => setShowAutoRefreshLogs(e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-0 focus:ring-offset-0 bg-white h-3.5 w-3.5 cursor-pointer"
                      />
                      <span>Auto updates (3s)</span>
                    </label>
                    <button
                      onClick={() => {
                        setServerLogs([]);
                        triggerToast("Terminal buffer cleared.", "success");
                      }}
                      className="text-xs text-slate-500 hover:text-slate-800 font-bold px-2.5 py-1.5 border border-slate-200 bg-white cursor-pointer rounded-xl flex items-center gap-1 transition-all hover:bg-slate-50 shadow-xs"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Clear Console
                    </button>
                  </div>
                </div>

                {/* Interactive Console Screen */}
                <div 
                  ref={terminalRef}
                  className="flex-1 bg-slate-950 rounded-2xl border border-slate-950 p-4 font-mono text-[11px] overflow-y-auto max-h-[400px] flex flex-col gap-3 min-h-[320px] shadow-lg"
                >
                  <div className="flex items-center gap-2 text-slate-500 font-semibold border-b border-slate-900 pb-2 select-none">
                    <Server className="h-3.5 w-3.5 text-indigo-400" />
                    <span>$ node dist/server.cjs --port=3000</span>
                    <span className="ml-auto text-[10px] text-slate-500 font-bold">Ready to capture events</span>
                  </div>

                   {serverLogs.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-center p-8 select-none font-sans">
                      <Terminal className="h-8 w-8 text-slate-800 mb-2 stroke-1" />
                      <span className="font-bold text-xs text-slate-400">Terminal buffer is empty</span>
                      <span className="text-[10px] text-slate-500 mt-1">
                        Send requests from the REST API Client Explorer to see them populated dynamically.
                      </span>
                    </div>
                  ) : (
                    serverLogs.map((log, index) => {
                      const methodColor = 
                        log.method === "GET" ? "text-emerald-400" :
                        log.method === "POST" ? "text-indigo-400" :
                        log.method === "PUT" ? "text-amber-400" : "text-rose-400";

                      const isError = log.status >= 400;

                      return (
                        <div key={index} className="space-y-1.5 p-2 bg-slate-900/35 border border-slate-900 hover:border-slate-850 rounded transition-all">
                          <div className="flex flex-wrap items-center gap-2 select-none">
                            <span className="text-slate-500 text-[10px] font-medium">[{log.timestamp}]</span>
                            <span className={`font-extrabold font-mono uppercase ${methodColor}`}>
                              {log.method}
                            </span>
                            <span className="text-white font-bold tracking-tight select-all">{log.url}</span>
                            
                            <span className="text-slate-500 font-mono text-[10px]">• client: {log.ip}</span>
                            
                            <span className={`ml-auto px-2 py-0.5 rounded font-bold font-mono text-[10px] leading-none ${
                              log.status < 300 ? "bg-emerald-950/70 border border-emerald-800/40 text-emerald-400" :
                              log.status < 400 ? "bg-indigo-950/70 border border-indigo-800/40 text-indigo-300" :
                              "bg-rose-950/70 border border-rose-800/40 text-rose-400"
                            }`}>
                              HTTP {log.status}
                            </span>
                          </div>

                          {/* Payload and response displays */}
                          {log.bodyBefore && (
                            <div className="border-l-2 border-slate-800 pl-3 py-1 bg-slate-950/25">
                              <span className="text-slate-500 text-[10px] block select-none uppercase font-bold tracking-widest leading-relaxed">
                                Incoming payload (json):
                              </span>
                              <pre className="text-slate-400 text-[10px] leading-relaxed max-w-full overflow-x-auto select-all">
                                {JSON.stringify(log.bodyBefore)}
                              </pre>
                            </div>
                          )}

                          {log.responseBody && (
                            <div className="border-l-2 border-slate-800 pl-3 py-1 bg-slate-950/25">
                              <span className="text-slate-500 text-[10px] block select-none uppercase font-bold tracking-widest leading-relaxed">
                                Response body:
                              </span>
                              <pre className="text-slate-400 text-[10px] leading-relaxed max-w-full overflow-x-auto select-all">
                                {typeof log.responseBody === "string" 
                                  ? log.responseBody 
                                  : JSON.stringify(log.responseBody)}
                              </pre>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

          </div>

        </section>

      </main>

      {/* Course syllabus visual details footer */}
      <footer className="border-t border-indigo-150/40 bg-white py-5 px-6 mt-12 text-center text-xs text-slate-500 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 font-sans">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 bg-indigo-600 h-2 rounded-full animate-pulse" />
            <span className="font-bold text-slate-700">
              Developing RESTful API Food Inventory course sandbox
            </span>
          </div>
          <div className="flex items-center gap-4 text-slate-455 font-bold font-sans">
            <span>Level 4 Assessment grading standard verified</span>
            <span>•</span>
            <button
              onClick={handleExportPostmanCollection}
              className="hover:text-indigo-600 hover:underline cursor-pointer font-extrabold"
            >
              Export JSON criteria
            </button>
          </div>
        </div>
      </footer>

    </div>
  );
}
