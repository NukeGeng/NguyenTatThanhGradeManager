import {
  ApplicationConfig,
  importProvidersFrom,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import {
  ArrowLeft,
  ArrowRight,
  BellRing,
  Building2,
  ChevronRight,
  BookOpenCheck,
  ChartColumnIncreasing,
  Eye,
  EyeOff,
  GraduationCap,
  Info,
  Layers,
  LucideAngularModule,
  Mail,
  Pencil,
  Plus,
  School,
  Search,
  Trash2,
  UserCheck,
  UserPlus,
  ShieldCheck,
  TrendingUp,
  XCircle,
  CheckCircle,
  Users,
} from 'lucide-angular';

import { routes } from './app.routes';
import { jwtInterceptor } from './core/interceptors/jwt.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideAnimationsAsync(),
    importProvidersFrom(
      LucideAngularModule.pick({
        ArrowLeft,
        ArrowRight,
        BellRing,
        Building2,
        BookOpenCheck,
        ChevronRight,
        ChartColumnIncreasing,
        CheckCircle,
        Eye,
        EyeOff,
        GraduationCap,
        Info,
        Layers,
        Mail,
        Pencil,
        Plus,
        School,
        Search,
        ShieldCheck,
        TrendingUp,
        Trash2,
        UserCheck,
        UserPlus,
        Users,
        XCircle,
      }),
    ),
    // Cau hinh HttpClient toan cuc va tu dong gan JWT cho moi request.
    provideHttpClient(withInterceptors([jwtInterceptor])),
  ],
};
