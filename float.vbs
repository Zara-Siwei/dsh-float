' float.vbs - zero-flash one-click launcher for DeepSeek Float.
' Runs dsh --profile float in a hidden console (window style 0), so only the
' floating Electron window appears; it exits when the window closes.
CreateObject("WScript.Shell").Run "cmd /c dsh --profile float", 0, False
