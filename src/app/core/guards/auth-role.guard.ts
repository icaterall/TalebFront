import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthRoleGuard implements CanActivate {

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {
    // Get required role from route data
    const requiredRole = route.data['requiredRole'] as string;
    const redirectPath = route.data['redirectPath'] as string;

    console.log(`AuthRoleGuard: Checking access for role: ${requiredRole || 'any'}`);

    // Use universal validation
    return this.authService.validateAuthAndRole(requiredRole, redirectPath);
  }
}
