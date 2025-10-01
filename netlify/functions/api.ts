import express, { type Request, Response, NextFunction } from "express";
import serverless from "serverless-http";
import { z } from "zod";
import { insertWatchHistorySchema, insertFavoriteSchema, insertNotificationSchema, insertUserSchema, type User } from "../../shared/schema";
import { storage } from "../../server/storage";
import { JSONParser } from "../../server/json-parser";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

async function getDefaultUserId(): Promise<string> {
  let DEFAULT_USER_ID = "";
  const users = Array.from((storage as any).users.values()) as User[];
  if (users.length > 0) {
    DEFAULT_USER_ID = users[0].id;
  } else {
    const defaultUser = await storage.createUser({
      name: "مستخدم افتراضي",
      email: "default@example.com",
      age: 25,
      avatarUrl: "https://images.unsplash.com/photo-1539650116574-75c0c6d1ae06?w=64&h=64&fit=crop"
    });
    DEFAULT_USER_ID = defaultUser.id;
  }
  return DEFAULT_USER_ID;
}

app.get("/api/media", async (req, res) => {
  try {
    const { type, year, category } = req.query;
    const filters: any = {};
    
    if (type) filters.type = type as string;
    if (year) filters.year = parseInt(year as string);
    if (category) filters.category = category as string;

    const media = await storage.getAllMedia(filters);
    res.json(media);
  } catch (error) {
    res.status(500).json({ message: "خطأ في جلب الوسائط" });
  }
});

app.get("/api/movies", async (req, res) => {
  try {
    const { year, category } = req.query;
    const filters: any = {};
    
    if (year) filters.year = parseInt(year as string);
    if (category) filters.category = category as string;

    const movies = await storage.getAllMovies(filters);
    res.json(movies);
  } catch (error) {
    res.status(500).json({ message: "خطأ في جلب الأفلام" });
  }
});

app.get("/api/movies/trending", async (req, res) => {
  try {
    const movies = await storage.getTrendingMovies();
    res.json(movies);
  } catch (error) {
    res.status(500).json({ message: "خطأ في جلب الأفلام الشائعة" });
  }
});

app.get("/api/movies/new", async (req, res) => {
  try {
    const movies = await storage.getNewMovies();
    res.json(movies);
  } catch (error) {
    res.status(500).json({ message: "خطأ في جلب الأفلام الجديدة" });
  }
});

app.get("/api/movies/search", async (req, res) => {
  try {
    const { q, limit } = req.query;
    if (!q) {
      return res.status(400).json({ message: "يجب توفير كلمة البحث" });
    }
    let searchLimit: number | undefined = undefined;
    if (limit) {
      const parsedLimit = parseInt(limit as string, 10);
      if (!isNaN(parsedLimit) && parsedLimit > 0 && parsedLimit <= 100) {
        searchLimit = parsedLimit;
      }
    }
    const movies = await storage.searchMovies(q as string, searchLimit);
    res.json(movies);
  } catch (error) {
    res.status(500).json({ message: "خطأ في البحث عن الأفلام" });
  }
});

app.get("/api/series", async (req, res) => {
  try {
    const { year, category, seriesType } = req.query;
    const filters: any = {};
    
    if (year) filters.year = parseInt(year as string);
    if (category) filters.category = category as string;
    if (seriesType) filters.seriesType = seriesType as string;

    const series = await storage.getAllSeries(filters);
    res.json(series);
  } catch (error) {
    res.status(500).json({ message: "خطأ في جلب المسلسلات" });
  }
});

app.get("/api/series/trending", async (req, res) => {
  try {
    const series = await storage.getTrendingSeries();
    res.json(series);
  } catch (error) {
    res.status(500).json({ message: "خطأ في جلب المسلسلات الشائعة" });
  }
});

app.get("/api/series/new", async (req, res) => {
  try {
    const series = await storage.getNewSeries();
    res.json(series);
  } catch (error) {
    res.status(500).json({ message: "خطأ في جلب المسلسلات الجديدة" });
  }
});

app.get("/api/series/search", async (req, res) => {
  try {
    const { q, limit } = req.query;
    if (!q) {
      return res.status(400).json({ message: "يجب توفير كلمة البحث" });
    }
    let searchLimit: number | undefined = undefined;
    if (limit) {
      const parsedLimit = parseInt(limit as string, 10);
      if (!isNaN(parsedLimit) && parsedLimit > 0 && parsedLimit <= 100) {
        searchLimit = parsedLimit;
      }
    }
    const series = await storage.searchSeries(q as string, searchLimit);
    res.json(series);
  } catch (error) {
    res.status(500).json({ message: "خطأ في البحث عن المسلسلات" });
  }
});

app.get("/api/other-media", async (req, res) => {
  try {
    const { type, year, category } = req.query;
    const filters: any = {};
    
    if (type) filters.type = type as string;
    if (year) filters.year = parseInt(year as string);
    if (category) filters.category = category as string;

    const otherMedia = await storage.getAllOtherMedia(filters);
    res.json(otherMedia);
  } catch (error) {
    res.status(500).json({ message: "خطأ في جلب المحتوى الآخر" });
  }
});

app.get("/api/other-media/trending", async (req, res) => {
  try {
    const otherMedia = await storage.getTrendingOtherMedia();
    res.json(otherMedia);
  } catch (error) {
    res.status(500).json({ message: "خطأ في جلب المحتوى الآخر الشائع" });
  }
});

app.get("/api/other-media/new", async (req, res) => {
  try {
    const otherMedia = await storage.getNewOtherMedia();
    res.json(otherMedia);
  } catch (error) {
    res.status(500).json({ message: "خطأ في جلب المحتوى الآخر الجديد" });
  }
});

app.get("/api/other-media/search", async (req, res) => {
  try {
    const { q, limit } = req.query;
    if (!q) {
      return res.status(400).json({ message: "يجب توفير كلمة البحث" });
    }
    let searchLimit: number | undefined = undefined;
    if (limit) {
      const parsedLimit = parseInt(limit as string, 10);
      if (!isNaN(parsedLimit) && parsedLimit > 0 && parsedLimit <= 100) {
        searchLimit = parsedLimit;
      }
    }
    const otherMedia = await storage.searchOtherMedia(q as string, searchLimit);
    res.json(otherMedia);
  } catch (error) {
    res.status(500).json({ message: "خطأ في البحث عن المحتوى الآخر" });
  }
});

app.get("/api/media/trending", async (req, res) => {
  try {
    const media = await storage.getTrendingMedia();
    res.json(media);
  } catch (error) {
    res.status(500).json({ message: "خطأ في جلب الوسائط الشائعة" });
  }
});

app.get("/api/media/new-releases", async (req, res) => {
  try {
    const media = await storage.getNewReleases();
    res.json(media);
  } catch (error) {
    res.status(500).json({ message: "خطأ في جلب الإصدارات الجديدة" });
  }
});

app.get("/api/media/search", async (req, res) => {
  try {
    const { q, limit } = req.query;
    if (!q) {
      return res.status(400).json({ message: "يجب توفير كلمة البحث" });
    }
    let searchLimit: number | undefined = undefined;
    if (limit) {
      const parsedLimit = parseInt(limit as string, 10);
      if (!isNaN(parsedLimit) && parsedLimit > 0 && parsedLimit <= 100) {
        searchLimit = parsedLimit;
      }
    }
    const media = await storage.searchMedia(q as string, searchLimit);
    res.json(media);
  } catch (error) {
    res.status(500).json({ message: "خطأ في البحث" });
  }
});

app.get("/api/media/years", async (req, res) => {
  try {
    const { type } = req.query;
    const years = await storage.getYearsWithCounts(type as string);
    res.json(years);
  } catch (error) {
    res.status(500).json({ message: "خطأ في جلب السنوات" });
  }
});

app.get("/api/media/recommendations/:id", async (req, res) => {
  try {
    const recommendations = await storage.getRecommendations(req.params.id);
    res.json(recommendations);
  } catch (error) {
    res.status(500).json({ message: "خطأ في جلب الاقتراحات" });
  }
});

app.get("/api/movie/:id/recommendations", async (req, res) => {
  try {
    const recommendations = await storage.getRecommendations(req.params.id);
    res.json(recommendations);
  } catch (error) {
    res.status(500).json({ message: "خطأ في جلب اقتراحات الأفلام" });
  }
});

app.get("/api/series/:id/recommendations", async (req, res) => {
  try {
    const recommendations = await storage.getRecommendations(req.params.id);
    res.json(recommendations);
  } catch (error) {
    res.status(500).json({ message: "خطأ في جلب اقتراحات المسلسلات" });
  }
});

app.get("/api/media/export", async (req, res) => {
  try {
    const { format = 'json' } = req.query;
    
    const allMedia = await storage.exportAllMediaToJSON();
    
    if (format === 'download') {
      const jsonString = JSONParser.exportToCleanJSON(allMedia);
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="media-export.json"');
      res.send(jsonString);
    } else {
      res.json({
        message: "تم تصدير البيانات بنجاح",
        count: allMedia.length,
        data: allMedia
      });
    }
  } catch (error) {
    console.error('خطأ في تصدير البيانات:', error);
    res.status(500).json({ 
      message: "خطأ في تصدير البيانات",
      error: error instanceof Error ? error.message : 'خطأ غير معروف'
    });
  }
});

app.post("/api/media/import", async (req, res) => {
  try {
    const { jsonData } = req.body;
    
    if (!jsonData) {
      return res.status(400).json({ message: "يجب توفير jsonData" });
    }
    
    let dataToImport: any[] = [];
    
    if (typeof jsonData === 'string') {
      const validation = JSONParser.validateJSONData(jsonData);
      if (!validation.isValid) {
        return res.status(400).json({ message: validation.error });
      }
      dataToImport = validation.data || [];
    } else {
      dataToImport = Array.isArray(jsonData) ? jsonData : [jsonData];
    }

    if (dataToImport.length === 0) {
      return res.status(400).json({ message: "لم يتم العثور على بيانات صالحة للاستيراد" });
    }

    const transformedData = JSONParser.transformToInternalFormat(dataToImport);
    const results = await storage.importMediaFromJSON(transformedData);
    
    res.json({
      message: "تم الاستيراد بنجاح",
      results: {
        total: dataToImport.length,
        success: results.success,
        failed: results.failed,
        errors: results.errors
      }
    });
  } catch (error) {
    console.error('خطأ في استيراد البيانات:', error);
    res.status(500).json({ 
      message: "خطأ في استيراد البيانات",
      error: error instanceof Error ? error.message : 'خطأ غير معروف'
    });
  }
});

app.post("/api/media/validate-json", async (req, res) => {
  try {
    const { jsonData } = req.body;
    
    if (!jsonData) {
      return res.status(400).json({ message: "يجب توفير jsonData" });
    }
    
    const validation = JSONParser.validateJSONData(
      typeof jsonData === 'string' ? jsonData : JSON.stringify(jsonData)
    );
    
    if (validation.isValid) {
      res.json({
        valid: true,
        message: "البيانات صالحة",
        itemCount: validation.data?.length || 0
      });
    } else {
      res.json({
        valid: false,
        message: validation.error
      });
    }
  } catch (error) {
    res.status(500).json({ 
      message: "خطأ في التحقق من البيانات",
      error: error instanceof Error ? error.message : 'خطأ غير معروف'
    });
  }
});

app.get("/api/media/:id", async (req, res) => {
  try {
    const media = await storage.getMediaById(req.params.id);
    if (!media) {
      return res.status(404).json({ message: "الوسائط غير موجودة" });
    }
    res.json(media);
  } catch (error) {
    res.status(500).json({ message: "خطأ في جلب تفاصيل الوسائط" });
  }
});

app.get("/api/movie/:id", async (req, res) => {
  try {
    const media = await storage.getMediaById(req.params.id);
    if (!media) {
      return res.status(404).json({ message: "الفيلم غير موجود" });
    }
    res.json(media);
  } catch (error) {
    res.status(500).json({ message: "خطأ في جلب تفاصيل الفيلم" });
  }
});

app.get("/api/series/:id", async (req, res) => {
  try {
    const media = await storage.getMediaById(req.params.id);
    if (!media) {
      return res.status(404).json({ message: "المسلسل غير موجود" });
    }
    res.json(media);
  } catch (error) {
    res.status(500).json({ message: "خطأ في جلب تفاصيل المسلسل" });
  }
});

app.get("/api/series/:seriesId/episodes/:episodeNumber", async (req, res) => {
  try {
    const { seriesId, episodeNumber } = req.params;
    const episodeData = await storage.getEpisodeById(seriesId, parseInt(episodeNumber));
    
    if (!episodeData) {
      return res.status(404).json({ message: "الحلقة غير موجودة" });
    }
    
    res.json(episodeData);
  } catch (error) {
    res.status(500).json({ message: "خطأ في جلب تفاصيل الحلقة" });
  }
});

app.get("/api/watch-history", async (req, res) => {
  try {
    const userId = await getDefaultUserId();
    const history = await storage.getWatchHistory(userId);
    res.json(history);
  } catch (error) {
    res.status(500).json({ message: "خطأ في جلب سجل المشاهدة" });
  }
});

app.get("/api/continue-watching", async (req, res) => {
  try {
    const userId = await getDefaultUserId();
    const continueWatching = await storage.getContinueWatching(userId);
    res.json(continueWatching);
  } catch (error) {
    res.status(500).json({ message: "خطأ في جلب المشاهدة المستمرة" });
  }
});

app.post("/api/watch-history", async (req, res) => {
  try {
    const userId = await getDefaultUserId();
    const validatedData = insertWatchHistorySchema.parse({
      ...req.body,
      userId,
    });
    const history = await storage.updateWatchHistory(validatedData);
    res.json(history);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "بيانات غير صحيحة", errors: error.errors });
    }
    res.status(500).json({ message: "خطأ في تحديث سجل المشاهدة" });
  }
});

app.get("/api/favorites", async (req, res) => {
  try {
    const userId = await getDefaultUserId();
    const favorites = await storage.getFavorites(userId);
    res.json(favorites);
  } catch (error) {
    res.status(500).json({ message: "خطأ في جلب المفضلة" });
  }
});

app.post("/api/favorites", async (req, res) => {
  try {
    const userId = await getDefaultUserId();
    const validatedData = insertFavoriteSchema.parse({
      ...req.body,
      userId,
    });
    const favorite = await storage.addToFavorites(validatedData);
    res.json(favorite);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "بيانات غير صحيحة", errors: error.errors });
    }
    res.status(500).json({ message: "خطأ في إضافة المفضلة" });
  }
});

app.delete("/api/favorites/:mediaId", async (req, res) => {
  try {
    const userId = await getDefaultUserId();
    const success = await storage.removeFromFavorites(userId, req.params.mediaId);
    if (!success) {
      return res.status(404).json({ message: "المفضلة غير موجودة" });
    }
    res.json({ message: "تم حذف المفضلة بنجاح" });
  } catch (error) {
    res.status(500).json({ message: "خطأ في حذف المفضلة" });
  }
});

app.get("/api/favorites/:mediaId/check", async (req, res) => {
  try {
    const userId = await getDefaultUserId();
    const isFavorite = await storage.isFavorite(userId, req.params.mediaId);
    res.json({ isFavorite });
  } catch (error) {
    res.status(500).json({ message: "خطأ في فحص المفضلة" });
  }
});

app.get("/api/notifications", async (req, res) => {
  try {
    const userId = await getDefaultUserId();
    const notifications = await storage.getNotifications(userId);
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: "خطأ في جلب الإشعارات" });
  }
});

app.get("/api/notifications/unread-count", async (req, res) => {
  try {
    const userId = await getDefaultUserId();
    const count = await storage.getUnreadNotificationCount(userId);
    res.json({ count });
  } catch (error) {
    res.status(500).json({ message: "خطأ في جلب عدد الإشعارات غير المقروءة" });
  }
});

app.patch("/api/notifications/:id/read", async (req, res) => {
  try {
    const success = await storage.markNotificationAsRead(req.params.id);
    if (!success) {
      return res.status(404).json({ message: "الإشعار غير موجود" });
    }
    res.json({ message: "تم تحديث حالة الإشعار بنجاح" });
  } catch (error) {
    res.status(500).json({ message: "خطأ في تحديث الإشعار" });
  }
});

app.get("/api/profile", async (req, res) => {
  try {
    const userId = await getDefaultUserId();
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: "المستخدم غير موجود" });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "خطأ في جلب بيانات المستخدم" });
  }
});

app.patch("/api/profile", async (req, res) => {
  try {
    const userId = await getDefaultUserId();
    const validatedData = insertUserSchema.partial().parse(req.body);
    const user = await storage.updateUser(userId, validatedData);
    if (!user) {
      return res.status(404).json({ message: "المستخدم غير موجود" });
    }
    res.json(user);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "بيانات غير صحيحة", errors: error.errors });
    }
    res.status(500).json({ message: "خطأ في تحديث بيانات المستخدم" });
  }
});


app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ message });
});

export const handler = serverless(app);
