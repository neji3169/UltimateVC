import os
import sys
import shutil
import json

# --- 1. Python Embedded & Dependency Path Resolution ---
current_dir = os.path.dirname(os.path.abspath(__file__))
runtime_dir = os.path.join(current_dir, "runtime")
site_packages_dir = os.path.join(runtime_dir, "Lib", "site-packages")

# Essential search paths for Windows Embedded Python and pywin32
candidate_paths = [
    current_dir,
    runtime_dir,
    site_packages_dir,
    os.path.join(site_packages_dir, "win32"),
    os.path.join(site_packages_dir, "win32", "lib"),
    os.path.join(site_packages_dir, "Pythonwin"),
]
for p in candidate_paths:
    if p not in sys.path:
        sys.path.insert(0, p)

# Fix embedded python .pth file if present so child processes inherit paths
pth_file = os.path.join(runtime_dir, "python312._pth")
if os.path.exists(pth_file):
    try:
        with open(pth_file, "r") as f:
            pth_content = f.read()
        needed_lines = [
            "python312.zip",
            ".",
            "Lib\\site-packages",
            "Lib\\site-packages\\win32",
            "Lib\\site-packages\\win32\\lib",
            "Lib\\site-packages\\Pythonwin",
            "import site"
        ]
        if "win32" not in pth_content:
            with open(pth_file, "w") as f:
                f.write("\n".join(needed_lines) + "\n")
    except Exception:
        pass

# Ensure pywin32.pth exists in site-packages
if os.path.exists(site_packages_dir):
    try:
        pywin32_pth = os.path.join(site_packages_dir, "pywin32.pth")
        if not os.path.exists(pywin32_pth):
            with open(pywin32_pth, "w") as f:
                f.write("win32\nwin32\\lib\nPythonwin\n")
    except Exception:
        pass

# Add DLL directory for pywin32 system DLLs
pywin32_sys32 = os.path.join(site_packages_dir, "pywin32_system32")
if os.path.exists(pywin32_sys32):
    if hasattr(os, "add_dll_directory"):
        try:
            os.add_dll_directory(pywin32_sys32)
        except Exception:
            pass
    # Copy DLLs to runtime root and win32 folder to guarantee dynamic loader finds them
    for dll in ["pywintypes312.dll", "pythoncom312.dll", "pywintypes311.dll", "pywintypes310.dll"]:
        src = os.path.join(pywin32_sys32, dll)
        if os.path.exists(src):
            dst1 = os.path.join(runtime_dir, dll)
            dst2 = os.path.join(site_packages_dir, "win32", dll)
            if not os.path.exists(dst1):
                try: shutil.copy2(src, dst1)
                except Exception: pass
            if os.path.exists(os.path.join(site_packages_dir, "win32")) and not os.path.exists(dst2):
                try: shutil.copy2(src, dst2)
                except Exception: pass

# --- 2. Auto-repair missing packages (pywin32, psutil, etc.) ---
def auto_repair_dependencies():
    need_install = []
    try:
        import win32api
    except ImportError:
        need_install.append("pywin32==308")
    try:
        import psutil
    except ImportError:
        need_install.append("psutil")

    if need_install:
        python_exe = os.path.join(runtime_dir, "python.exe")
        if not os.path.exists(python_exe):
            python_exe = sys.executable
        print(f"[UltimateVC] Missing runtime packages detected ({need_install}). Installing automatically...")
        import subprocess
        try:
            subprocess.run([python_exe, "-m", "pip", "install", "--no-warn-script-location", *need_install], check=False)
            for p in candidate_paths:
                if p not in sys.path:
                    sys.path.insert(0, p)
        except Exception as e:
            print(f"[UltimateVC] Warning during auto-install: {e}")

auto_repair_dependencies()

# --- 3. Safety Fallback Compatibility Shim ---
# If win32api is still somehow unavailable due to system DLL missing, provide safe shims so gui.gui never crashes!
try:
    import win32api
except ImportError:
    import types
    print("[UltimateVC] win32api module unavailable; loading safe compatibility shim...")
    mock_api = types.ModuleType("win32api")
    mock_api.GetCurrentProcess = lambda: 0
    mock_api.OpenProcess = lambda *args: 0
    mock_api.SetPriorityClass = lambda *args: True
    mock_api.GetSystemMetrics = lambda *args: 1920
    sys.modules["win32api"] = mock_api

try:
    import win32con
except ImportError:
    import types
    mock_con = types.ModuleType("win32con")
    mock_con.HIGH_PRIORITY_CLASS = 0x00000080
    mock_con.REALTIME_PRIORITY_CLASS = 0x00000100
    mock_con.NORMAL_PRIORITY_CLASS = 0x00000020
    sys.modules["win32con"] = mock_con

try:
    import win32process
except ImportError:
    import types
    mock_proc = types.ModuleType("win32process")
    mock_proc.SetPriorityClass = lambda *args: True
    mock_proc.HIGH_PRIORITY_CLASS = 0x00000080
    sys.modules["win32process"] = mock_proc

# --- 4. Initialize CPU limits ---
try:
    from utils.cpu_manager import initialize_cpu_limits
    if "--use-all-cores" in sys.argv:
        try:
            import psutil
            total_cores = psutil.cpu_count() or 4
        except Exception:
            total_cores = 4
        initialize_cpu_limits(max_cores=total_cores, max_threads=total_cores)
        print(f"[UltimateVC] Using all {total_cores} CPU cores (--use-all-cores flag)")
    else:
        initialize_cpu_limits()
except Exception as e:
    print(f"[UltimateVC] Notice on CPU limits: {e}")

def ensure_pystray():
    """Check if pystray is installed and install it if not"""
    try:
        import pystray
        return True
    except ImportError:
        import subprocess
        python_exe = os.path.join(current_dir, "runtime", "python.exe")
        if not os.path.exists(python_exe):
            python_exe = sys.executable
        try:
            result = subprocess.run(
                [python_exe, "-m", "pip", "install", "pystray", "Pillow"],
                capture_output=True,
                text=True
            )
            return result.returncode == 0
        except Exception as e:
            print(f"[UltimateVC] Error installing pystray: {e}")
            return False

# --- 5. Equalizer Presets Engine & GUI Integration ---
EQUALIZER_PRESETS = {
    "anime_kadin": {
        "name": "🎀 Anime Kadın Sesi",
        "description": "Erkek ve kalın rezonansı keser, sevimli anime & parlak vokal varlığını güçlendirir.",
        "filters": {
            "peak_filter_1": {"cutoff_frequency_hz": 180.0, "gain_db": -8.0, "q": 1.0, "enabled": True},
            "peak_filter_2": {"cutoff_frequency_hz": 650.0, "gain_db": -2.5, "q": 1.0, "enabled": True},
            "peak_filter_3": {"cutoff_frequency_hz": 3200.0, "gain_db": 5.5, "q": 1.0, "enabled": True},
            "peak_filter_4": {"cutoff_frequency_hz": 8500.0, "gain_db": 4.0, "q": 1.0, "enabled": True},
        }
    },
    "ince_ses": {
        "name": "✨ İnce Ses",
        "description": "Alt frekansları tamamen tıraşlar, üst frekansları parlatarak ultra ince/tiz vokal oluşturur.",
        "filters": {
            "peak_filter_1": {"cutoff_frequency_hz": 220.0, "gain_db": -9.5, "q": 1.0, "enabled": True},
            "peak_filter_2": {"cutoff_frequency_hz": 900.0, "gain_db": 1.5, "q": 1.0, "enabled": True},
            "peak_filter_3": {"cutoff_frequency_hz": 4000.0, "gain_db": 6.0, "q": 1.0, "enabled": True},
            "peak_filter_4": {"cutoff_frequency_hz": 9500.0, "gain_db": 5.0, "q": 1.0, "enabled": True},
        }
    },
    "natural_kadin": {
        "name": "🎙️ Natural Kadın Sesi",
        "description": "Organik ve dengeli kadın konuşma formantı: Basları yumuşatır, anlaşılırlık katar.",
        "filters": {
            "peak_filter_1": {"cutoff_frequency_hz": 150.0, "gain_db": -4.5, "q": 1.0, "enabled": True},
            "peak_filter_2": {"cutoff_frequency_hz": 800.0, "gain_db": 1.0, "q": 1.0, "enabled": True},
            "peak_filter_3": {"cutoff_frequency_hz": 2800.0, "gain_db": 3.5, "q": 1.0, "enabled": True},
            "peak_filter_4": {"cutoff_frequency_hz": 7000.0, "gain_db": 2.5, "q": 1.0, "enabled": True},
        }
    },
    "derin_erkek": {
        "name": "🔊 Derin Erkek Sesi",
        "description": "Göğüs rezonansını (120Hz) ve gövdeyi güçlendirir, tiz sertlikleri yumuşatır.",
        "filters": {
            "peak_filter_1": {"cutoff_frequency_hz": 120.0, "gain_db": 5.0, "q": 1.0, "enabled": True},
            "peak_filter_2": {"cutoff_frequency_hz": 500.0, "gain_db": 1.5, "q": 1.0, "enabled": True},
            "peak_filter_3": {"cutoff_frequency_hz": 2500.0, "gain_db": -1.5, "q": 1.0, "enabled": True},
            "peak_filter_4": {"cutoff_frequency_hz": 6500.0, "gain_db": -1.0, "q": 1.0, "enabled": True},
        }
    },
    "temiz_vokal": {
        "name": "🎙️ Temiz Vokal & Podcast",
        "description": "Boğukluğu giderir, arka plan uğultusunu keser ve konuşma netliğini artırır.",
        "filters": {
            "peak_filter_1": {"cutoff_frequency_hz": 120.0, "gain_db": -5.0, "q": 1.0, "enabled": True},
            "peak_filter_2": {"cutoff_frequency_hz": 450.0, "gain_db": -2.0, "q": 1.0, "enabled": True},
            "peak_filter_3": {"cutoff_frequency_hz": 3000.0, "gain_db": 3.0, "q": 1.0, "enabled": True},
            "peak_filter_4": {"cutoff_frequency_hz": 8000.0, "gain_db": 2.0, "q": 1.0, "enabled": True},
        }
    },
    "radyo_walkie": {
        "name": "📻 Radyo & Telsiz",
        "description": "350Hz altını ve 4kHz üstünü sert keserek nostaljik radyo/telsiz efekti verir.",
        "filters": {
            "peak_filter_1": {"cutoff_frequency_hz": 350.0, "gain_db": -12.0, "q": 1.5, "enabled": True},
            "peak_filter_2": {"cutoff_frequency_hz": 1200.0, "gain_db": 6.0, "q": 1.0, "enabled": True},
            "peak_filter_3": {"cutoff_frequency_hz": 2800.0, "gain_db": 4.5, "q": 1.0, "enabled": True},
            "peak_filter_4": {"cutoff_frequency_hz": 5000.0, "gain_db": -12.0, "q": 2.0, "enabled": True},
        }
    },
    "sifirla_flat": {
        "name": "⚖️ Sıfırla (Flat EQ)",
        "description": "Tüm ekolayzer bantlarını sıfırlar (0 dB).",
        "filters": {
            "peak_filter_1": {"cutoff_frequency_hz": 120.0, "gain_db": 0.0, "q": 1.0, "enabled": True},
            "peak_filter_2": {"cutoff_frequency_hz": 500.0, "gain_db": 0.0, "q": 1.0, "enabled": True},
            "peak_filter_3": {"cutoff_frequency_hz": 2500.0, "gain_db": 0.0, "q": 1.0, "enabled": True},
            "peak_filter_4": {"cutoff_frequency_hz": 8000.0, "gain_db": 0.0, "q": 1.0, "enabled": True},
        }
    }
}

def apply_equalizer_preset_to_config(preset_key: str):
    """Saves the selected equalizer preset directly into configs/effects.json"""
    preset = EQUALIZER_PRESETS.get(preset_key)
    if not preset:
        return
    
    effects_file = os.path.join(current_dir, "configs", "effects.json")
    try:
        os.makedirs(os.path.dirname(effects_file), exist_ok=True)
        data = {}
        if os.path.exists(effects_file):
            try:
                with open(effects_file, "r") as f:
                    data = json.load(f)
            except Exception:
                data = {}
        
        data["active_preset"] = preset_key
        for f_name, f_vals in preset["filters"].items():
            if f_name not in data:
                data[f_name] = {}
            data[f_name].update(f_vals)
            
        with open(effects_file, "w") as f:
            json.dump(data, f, indent=2)
        print(f"[UltimateVC] Equalizer preset applied: {preset['name']}")
    except Exception as e:
        print(f"[UltimateVC] Failed to save preset: {e}")

def apply_ultimatevc_branding_and_features():
    """Dynamically rebrand Vonovox to UltimateVC and inject Equalizer Presets UI"""
    try:
        import customtkinter as ctk

        # Rebrand window title
        _orig_title = ctk.CTk.title
        def _patched_title(self, string=None):
            if string is not None:
                string = string.replace("Vonovox", "UltimateVC").replace("vonovox", "UltimateVC")
                return _orig_title(self, string)
            return _orig_title(self)
        ctk.CTk.title = _patched_title

        # Rebrand text elements in widgets
        _orig_configure = ctk.CTkBaseClass.configure
        def _patched_configure(self, **kwargs):
            if 'text' in kwargs and isinstance(kwargs['text'], str) and 'Vonovox' in kwargs['text']:
                kwargs['text'] = kwargs['text'].replace('Vonovox', 'UltimateVC')
            return _orig_configure(self, **kwargs)
        ctk.CTkBaseClass.configure = _patched_configure

        # Patch constants
        try:
            import gui.constants as constants
            if hasattr(constants, 'APP_TITLE'):
                constants.APP_TITLE = "UltimateVC - Realtime AI Voice Converter"
        except Exception:
            pass

        # Inject Equalizer Presets bar into GUI Layout
        try:
            import gui.layout as layout_module
            if hasattr(layout_module, 'GUILayout'):
                _orig_create_effects = layout_module.GUILayout._create_effects_section
                
                def _patched_create_effects(self, parent):
                    # Call original effect section creation
                    effects_frame = _orig_create_effects(self, parent)
                    
                    # Create Equalizer Presets Quick-Select Toolbar inside effects
                    try:
                        preset_container = ctk.CTkFrame(effects_frame, corner_radius=10, fg_color=("#18181b", "#121215"), border_width=1, border_color="#27272a")
                        preset_container.pack(fill="x", padx=10, pady=(6, 4), before=effects_frame.winfo_children()[0] if effects_frame.winfo_children() else None)
                        
                        header_lbl = ctk.CTkLabel(
                            preset_container, 
                            text="🎚️ Hazır Equalizer Ayarları (Presets):", 
                            font=ctk.CTkFont(size=12, weight="bold"),
                            text_color="#10b981"
                        )
                        header_lbl.pack(side="left", padx=(10, 8), pady=6)
                        
                        btn_frame = ctk.CTkFrame(preset_container, fg_color="transparent")
                        btn_frame.pack(side="left", fill="x", expand=True, padx=4, pady=4)
                        
                        def make_click_handler(pkey):
                            def on_click():
                                apply_equalizer_preset_to_config(pkey)
                                # Update sliders in layout if available
                                preset_data = EQUALIZER_PRESETS[pkey]["filters"]
                                for f_name, f_vals in preset_data.items():
                                    slider_attr = f"{f_name}"
                                    if hasattr(self, slider_attr):
                                        try:
                                            slider = getattr(self, slider_attr)
                                            slider.set(f_vals["gain_db"])
                                        except Exception:
                                            pass
                            return on_click

                        presets_to_show = [
                            ("anime_kadin", "🎀 Anime Kadın", "#db2777"),
                            ("ince_ses", "✨ İnce Ses", "#9333ea"),
                            ("natural_kadin", "🎙️ Natural Kadın", "#2563eb"),
                            ("derin_erkek", "🔊 Derin Erkek", "#d97706"),
                            ("temiz_vokal", "🎙️ Temiz Vokal", "#059669"),
                            ("sifirla_flat", "⚖️ Sıfırla", "#4b5563")
                        ]
                        
                        for pkey, plabel, pcolor in presets_to_show:
                            b = ctk.CTkButton(
                                btn_frame,
                                text=plabel,
                                width=95,
                                height=26,
                                font=ctk.CTkFont(size=11, weight="bold"),
                                fg_color=pcolor,
                                hover_color="#27272a",
                                corner_radius=6,
                                command=make_click_handler(pkey)
                            )
                            b.pack(side="left", padx=3, pady=2)
                    except Exception as ex:
                        print(f"[UltimateVC] Notice: Could not inject preset bar to CTk: {ex}")
                        
                    return effects_frame
                
                layout_module.GUILayout._create_effects_section = _patched_create_effects
        except Exception as e:
            print(f"[UltimateVC] Notice on GUI patch: {e}")

    except Exception:
        pass

if __name__ == "__main__":
    ensure_pystray()
    apply_ultimatevc_branding_and_features()
    
    # Check for --hidden flag to restart without console
    if "--hidden" in sys.argv and "--restarted" not in sys.argv:
        import subprocess
        CREATE_NO_WINDOW = 0x08000000
        subprocess.Popen([sys.executable, __file__, "--hidden", "--restarted"], 
                        creationflags=CREATE_NO_WINDOW)
        sys.exit(0)
    
    from gui.gui import GUI
    GUI()
