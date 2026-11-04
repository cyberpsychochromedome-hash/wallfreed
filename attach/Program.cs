using System;
using System.IO;
using System.Runtime.InteropServices;
// Usage: attach.exe <hwnd> <x> <y> <width> <height>  -- parks a window behind the desktop icons.
// Writes a diagnostic log to %TEMP%\wallpaper-attach.log
class P {
  delegate bool EP(IntPtr h, IntPtr l);
  struct PT { public int X, Y; }
  [DllImport("user32")] static extern IntPtr FindWindow(string c, string t);
  [DllImport("user32")] static extern IntPtr FindWindowEx(IntPtr p, IntPtr a, string c, string t);
  [DllImport("user32")] static extern IntPtr SendMessageTimeout(IntPtr h, uint m, IntPtr w, IntPtr l, uint f, uint t, out IntPtr r);
  [DllImport("user32")] static extern bool EnumWindows(EP p, IntPtr l);
  [DllImport("user32")] static extern IntPtr SetParent(IntPtr c, IntPtr p);
  [DllImport("user32")] static extern bool SetWindowPos(IntPtr h, IntPtr a, int x, int y, int w, int ht, uint f);
  [DllImport("user32")] static extern bool ShowWindow(IntPtr h, int c);
  [DllImport("user32")] static extern bool ScreenToClient(IntPtr h, ref PT p);
  [DllImport("user32")] static extern bool SetProcessDpiAwarenessContext(IntPtr v);
  static string L = Path.Combine(Path.GetTempPath(), "wallpaper-attach.log");
  static void Log(string s) { try { File.AppendAllText(L, DateTime.Now.ToString("T") + " " + s + "\n"); } catch { } }
  static void Main(string[] a) {
    try {
      File.WriteAllText(L, "");
      try { SetProcessDpiAwarenessContext((IntPtr)(-4)); } catch { } // real pixels, not DPI-virtualized
      var h = (IntPtr)long.Parse(a[0]);
      int x = int.Parse(a[1]), y = int.Parse(a[2]), w = int.Parse(a[3]), ht = int.Parse(a[4]);
      var prog = FindWindow("Progman", null); IntPtr r;
      SendMessageTimeout(prog, 0x052C, IntPtr.Zero, IntPtr.Zero, 0, 1000, out r); // spawn the WorkerW layer
      IntPtr worker = IntPtr.Zero;
      EnumWindows((t, l) => {
        if (FindWindowEx(t, IntPtr.Zero, "SHELLDEF_DefView", null) != IntPtr.Zero)
          worker = FindWindowEx(IntPtr.Zero, t, "WorkerW", null);
        return true; }, IntPtr.Zero);
      Log("hwnd=" + h + " progman=" + prog + " classicWorkerW=" + worker + " rect=" + x + "," + y + "," + w + "x" + ht);
      if (worker != IntPtr.Zero) {
        SetParent(h, worker);
        var p = new PT { X = x, Y = y }; ScreenToClient(worker, ref p);
        Log("classic mode, client pos " + p.X + "," + p.Y);
        SetWindowPos(h, IntPtr.Zero, p.X, p.Y, w, ht, 0x14);
      } else {
        // newer Windows 11 layout: DefView (icons) lives inside Progman, so sit directly beneath it
        var defv = FindWindowEx(prog, IntPtr.Zero, "SHELLDEF_DefView", null);
        SetParent(h, prog);
        var p = new PT { X = x, Y = y }; ScreenToClient(prog, ref p);
        Log("progman mode, defview=" + defv + " client pos " + p.X + "," + p.Y);
        SetWindowPos(h, defv != IntPtr.Zero ? defv : (IntPtr)1, p.X, p.Y, w, ht, 0x10);
      }
      ShowWindow(h, 5);
      Log("done");
    } catch (Exception e) { Log("ERROR " + e); }
  }
}
