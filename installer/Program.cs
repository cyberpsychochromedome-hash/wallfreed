using System.Diagnostics; using System.IO.Compression; using System.Text.Json;
const string repo = "OWNER/REPO"; // replaced automatically by the GitHub workflow
var dest = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "WallpaperStudio");
using var http = new HttpClient(); http.DefaultRequestHeaders.UserAgent.ParseAdd("wallpaper-studio-setup");
Console.WriteLine("Finding latest version...");
var rel = JsonDocument.Parse(await http.GetStringAsync($"https://api.github.com/repos/{repo}/releases/latest"));
var url = rel.RootElement.GetProperty("assets").EnumerateArray()
  .First(a => a.GetProperty("name").GetString()!.EndsWith(".zip")).GetProperty("browser_download_url").GetString()!;
var tmp = Path.Combine(Path.GetTempPath(), "wsapp.zip");
Console.WriteLine("Downloading Wallpaper Studio...");
await using (var fs = File.Create(tmp)) await (await http.GetStreamAsync(url)).CopyToAsync(fs);
if (Directory.Exists(dest)) Directory.Delete(dest, true);
ZipFile.ExtractToDirectory(tmp, dest); File.Delete(tmp);
var exe = Path.Combine(dest, "WallpaperStudio.exe");
var lnk = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory), "Wallpaper Studio.lnk");
Process.Start(new ProcessStartInfo("powershell", $"-NoProfile -Command \"$s=(New-Object -ComObject WScript.Shell).CreateShortcut('{lnk}');$s.TargetPath='{exe}';$s.Save()\"") { CreateNoWindow = true })!.WaitForExit();
Process.Start(new ProcessStartInfo(exe) { UseShellExecute = true });
Console.WriteLine("Installed! Desktop shortcut created.");
