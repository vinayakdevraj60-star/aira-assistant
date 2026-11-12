const { desktopCapturer, screen } = require('electron');

class ScreenService {
  async getDisplays() {
    const displays = screen.getAllDisplays();
    return displays.map((disp, index) => ({
      index,
      id: disp.id,
      label: `Display ${index + 1} (${disp.size.width}x${disp.size.height})`,
      isPrimary: disp.id === screen.getPrimaryDisplay().id,
      bounds: disp.bounds
    }));
  }

  async captureScreen(displayIndex = 0, options = {}) {
    try {
      const displays = screen.getAllDisplays();
      const targetDisplay = displays[displayIndex] || screen.getPrimaryDisplay();
      const { width, height } = targetDisplay.size;
      const targetIdStr = targetDisplay.id.toString();

      const maxWidth = options.width || Math.min(width, 1920);
      const maxHeight = options.height || Math.min(height, 1080);
      const quality = options.quality !== undefined ? options.quality : 85;

      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: {
          width: maxWidth,
          height: maxHeight
        }
      });

      if (!sources || sources.length === 0) {
        throw new Error('No screen sources found');
      }

      // Match display by display_id first, then index, then fallback to first
      let source = sources.find(s => s.display_id === targetIdStr);
      if (!source && sources[displayIndex]) {
        source = sources[displayIndex];
      }
      if (!source) {
        source = sources[0];
      }

      if (!source.thumbnail || source.thumbnail.isEmpty()) {
        console.warn('[ScreenService] Thumbnail is empty for source:', source.name, source.id);
        const fallbackSources = await desktopCapturer.getSources({ types: ['screen'] });
        const fbSource = fallbackSources.find(s => s.display_id === targetIdStr) || fallbackSources[0];
        if (fbSource && fbSource.thumbnail && !fbSource.thumbnail.isEmpty()) {
          source = fbSource;
        }
      }

      const dataUrl = source.thumbnail.toDataURL('image/jpeg', quality);
      return dataUrl;
    } catch (err) {
      console.error('[ScreenService] Capture error:', err);
      throw err;
    }
  }

  async getWindows() {
    try {
      const sources = await desktopCapturer.getSources({
        types: ['window'],
        thumbnailSize: { width: 480, height: 270 },
        fetchWindowIcons: true
      });
      return sources
        .filter(s => s.name && !s.name.includes('AIRA') && s.name.trim().length > 0)
        .map(s => ({
          id: s.id,
          name: s.name,
          appIcon: s.appIcon ? s.appIcon.toDataURL() : null,
          thumbnail: s.thumbnail ? s.thumbnail.toDataURL('image/jpeg', 70) : null
        }));
    } catch (e) {
      console.warn('[ScreenService] getWindows error:', e);
      return [];
    }
  }

  async captureWindow(windowSourceId, options = {}) {
    try {
      const maxWidth = options.width || 1920;
      const maxHeight = options.height || 1080;
      const quality = options.quality !== undefined ? options.quality : 85;

      const sources = await desktopCapturer.getSources({
        types: ['window'],
        thumbnailSize: { width: maxWidth, height: maxHeight }
      });

      let target = sources.find(s => s.id === windowSourceId);
      if (!target && options.appName) {
        const appLower = options.appName.toLowerCase();
        target = sources.find(s => s.name.toLowerCase().includes(appLower));
      }

      if (!target || !target.thumbnail || target.thumbnail.isEmpty()) {
        throw new Error(`Target window "${windowSourceId}" not found or empty`);
      }

      return target.thumbnail.toDataURL('image/jpeg', quality);
    } catch (err) {
      console.error('[ScreenService] captureWindow error:', err);
      throw err;
    }
  }
}

module.exports = new ScreenService();
