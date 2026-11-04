using System.Diagnostics;
using System.IO.Compression;
using System.Text.Json;

const string repo = "OWNER/REPO"; // replaced automatically by the GitHub workflow
try
{
    var dest = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "WallpaperStudio");
    using var http = new HttpClient();
    http.DefaultRequestHeaders.UserAgent.ParseAdd("wallpaper-studio-setup");

    Console.WriteLine("Wallpaper Studio setup");
    Console.WriteLine("Finding latest version...");
    var rel = JsonDocument.Parse(await http.GetStringAsync($"https://api.github.com/repos/{repo}/releases/latest"));
    var asset = rel.RootElement.GetProperty("assets").EnumerateArray()
        .FirstOrDefault(a => a.GetProperty("name").GetString()!.EndsWith(".zip"));
    if (asset.ValueKind == JsonValueKind.Undefined) throw new Exception("The latest release has no .zip file attached.");
    var url = asset.GetProperty("browser_download_url").GetString()!;
    Console.WriteLine("Downloading " + asset.GetProperty("name").GetString() + " ...");

    var tmp = Path.Combine(Path.GetTempPath(), "wsapp.zip");
    await using (var fs = File.Create(tmp)) await (await http.GetStreamAsync(url)).CopyToAsync(fs);

    Console.WriteLine("Closing any running copy...");
    foreach (var p in Process.GetProcessesByName("WallpaperStudio")) { try { p.Kill(true); p.WaitForExit(5000); } catch { } }
    for (var i = 0; i < 4 && Directory.Exists(dest); i++)
    {
        try { Directory.Delete(dest, true); } catch { Thread.Sleep(1000); }
    }
    if (Directory.Exists(dest)) throw new Exception("Couldn't replace the old install in " + dest + ". Quit Wallpaper Studio from the tray and try again.");

    Console.WriteLine("Installing...");
    ZipFile.ExtractToDirectory(tmp, dest);
    File.Delete(tmp);

    var exe = Directory.GetFiles(dest, "WallpaperStudio.exe", SearchOption.AllDirectories).FirstOrDefault()
        ?? throw new Exception("WallpaperStudio.exe wasn't found inside the download.");

    try
    {
        var lnk = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory), "Wallpaper Studio.lnk");
        var ps = $"$s=(New-Object -ComObject WScript.Shell).CreateShortcut('{lnk}');$s.TargetPath='{exe}';$s.Save()";
        Process.Start(new ProcessStartInfo("powershell", $"-NoProfile -Command \"{ps}\"") { CreateNoWindow = true })!.WaitForExit();
    }
    catch { Console.WriteLine("(Couldn't create the desktop shortcut - you can still open it from: " + exe + ")"); }

    Process.Start(new ProcessStartInfo(exe) { UseShellExecute = true });
    Console.WriteLine("Installed! Wallpaper Studio is starting.");
    Thread.Sleep(3000);
}
catch (Exception e)
{
    var log = Path.Combine(Path.GetTempPath(), "wallpaper-setup-error.txt");
    try { File.WriteAllText(log, e.ToString()); } catch { }
    Console.WriteLine();
    Console.WriteLine("Setup failed: " + e.Message);
    Console.WriteLine("Details saved to: " + log);
    Console.WriteLine();
    Console.WriteLine("Press Enter to close.");
    Console.ReadLine();
}
