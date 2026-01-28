import { HttpInterceptorFn } from '@angular/common/http';

const TOKEN_KEY = 'daggle_token';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Read directly from localStorage to avoid circular dependency with AuthService
  const token = localStorage.getItem(TOKEN_KEY);

  if (token) {
    const cloned = req.clone({
      headers: req.headers.set('Authorization', `Bearer ${token}`),
    });
    return next(cloned);
  }

  return next(req);
};
