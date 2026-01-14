import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { UserService } from '../../service/user.service';

@Component({
  selector: 'app-auth',
  templateUrl: './auth.component.html',
  styleUrls: ['./auth.component.scss'],
  imports: [CommonModule, FormsModule]
})
export class AuthComponent {
  isLoginMode = true;

  // Message flags
  loginSuccess = false;
  loginError = false;
  registrationSuccess = false;
  registrationError = false;
  messageText = '';

  // Login form data
  loginData = {
    email: '',
    password: ''
  };

  // Registration form data
  registerData = {
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreeToTerms: false
  };

  constructor(
    private router: Router,
    private authService: UserService
  ) {
    console.log('🏗️ AuthComponent initialized');
  }

  toggleMode() {
    console.log(`🔄 Switching auth mode from ${this.isLoginMode ? 'login' : 'register'} to ${this.isLoginMode ? 'register' : 'login'}`);
    this.isLoginMode = !this.isLoginMode;
    this.clearForms();
  }

  clearForms() {
    console.log('🧹 Clearing forms and messages');
    this.loginData = { email: '', password: '' };
    this.registerData = {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      agreeToTerms: false
    };
    // Clear all message flags
    this.clearMessages();
  }

  clearMessages() {
    console.log('🧹 Clearing all messages');
    this.loginSuccess = false;
    this.loginError = false;
    this.registrationSuccess = false;
    this.registrationError = false;
    this.messageText = '';
  }

  onLogin() {
    console.log('🔐 Login attempt started');
    console.log('Login data:', { email: this.loginData.email, password: '***' });

    this.clearMessages();

    if (this.loginData.email && this.loginData.password) {
      console.log('✅ Login form validation passed');

      this.authService.login(this.loginData.email, this.loginData.password)
        .subscribe({
          next: (res) => {
            console.log('🔐 Login response received:', res);

            if (res.success) {
              console.log('✅ Login successful');
              this.loginSuccess = true;
              this.messageText = 'Uspešno ste se prijavili! Preusmerjamo vas...';

              // Redirect after a short delay to show the success message
              setTimeout(() => {
                console.log('🔄 Redirecting to home page');
                this.router.navigate(['/']);
              }, 1500);
            } else {
              console.log('❌ Login failed:', res.message);
              this.loginError = true;
              this.messageText = res.message || 'Napačen email ali geslo.';
            }
          },
          error: (err) => {
            console.error('❌ Login error occurred:', err);
            console.error('Error details:', {
              status: err.status,
              statusText: err.statusText,
              message: err.message,
              error: err.error
            });

            this.loginError = true;

            // Provide specific error messages based on status
            if (err.status === 0) {
              this.messageText = 'Napaka pri povezavi s strežnikom. Preverite internetno povezavo.';
            } else if (err.status === 401) {
              this.messageText = 'Napačen email ali geslo.';
            } else if (err.status >= 500) {
              this.messageText = 'Napaka strežnika. Poskusite znova čez nekaj trenutkov.';
            } else {
              this.messageText = err.error?.message || 'Napaka pri prijavi. Poskusite znova.';
            }
          }
        });
    } else {
      console.log('❌ Login form validation failed - missing fields');
      this.loginError = true;
      this.messageText = 'Prosimo, izpolnite vsa polja.';
    }
  }

  onRegister() {
    console.log('📝 Registration attempt started');
    console.log('Registration data:', {
      firstName: this.registerData.firstName,
      lastName: this.registerData.lastName,
      email: this.registerData.email,
      password: '***',
      confirmPassword: '***',
      agreeToTerms: this.registerData.agreeToTerms
    });

    this.clearMessages();

    if (this.validateRegistration()) {
      console.log('✅ Registration form validation passed');

      this.authService.register(this.registerData).subscribe({
        next: (res) => {
          console.log('📝 Registration response received:', res);

          if (res.user && res.token) {
            console.log('✅ Registration successful');
            this.registrationSuccess = true;
            this.messageText = res.message || 'Uspešno ste se registrirali! Preusmerjamo vas na prijavo...';

            // Switch to login mode after a short delay
            setTimeout(() => {
              console.log('🔄 Switching to login mode');
              this.isLoginMode = true;
              this.clearForms();
            }, 2000);
          } else {
            console.log('❌ Registration failed:', res.message);
            this.registrationError = true;
            this.messageText = res.message || 'Napaka pri registraciji. Poskusite znova.';
          }
        },
        error: (err) => {
          console.error('❌ Registration error occurred:', err);
          console.error('Error details:', {
            status: err.status,
            statusText: err.statusText,
            message: err.message,
            error: err.error
          });

          this.registrationError = true;

          // Provide specific error messages based on status
          if (err.status === 0) {
            this.messageText = 'Napaka pri povezavi s strežnikom. Preverite internetno povezavo.';
          } else if (err.status === 409) {
            this.messageText = 'Uporabnik s tem email naslovom že obstaja.';
          } else if (err.status === 400) {
            if (err.error?.errors && Array.isArray(err.error.errors) && err.error.errors.length > 0) {
              // Extract the first validation error message
              this.messageText = err.error.errors[0].msg;
            } else {
              this.messageText = err.error?.message || 'Napačni podatki. Preverite vnešene informacije.';
            }
          } else if (err.status >= 500) {
            this.messageText = 'Napaka strežnika. Poskusite znova čez nekaj trenutkov.';
          } else {
            this.messageText = err.error?.message || 'Napaka pri registraciji. Poskusite znova.';
          }
        }
      });
    } else {
      console.log('❌ Registration form validation failed');
    }
  }

  validateRegistration(): boolean {
    console.log('🔍 Validating registration form');

    if (!this.registerData.firstName || !this.registerData.lastName ||
      !this.registerData.email || !this.registerData.password ||
      !this.registerData.confirmPassword) {
      console.log('❌ Validation failed: Missing required fields');
      this.registrationError = true;
      this.messageText = 'Prosimo, izpolnite vsa polja.';
      return false;
    }

    if (this.registerData.password !== this.registerData.confirmPassword) {
      console.log('❌ Validation failed: Passwords do not match');
      this.registrationError = true;
      this.messageText = 'Gesli se ne ujemata.';
      return false;
    }

    if (this.registerData.password.length < 6) {
      console.log('❌ Validation failed: Password too short');
      this.registrationError = true;
      this.messageText = 'Geslo mora imeti vsaj 6 znakov.';
      return false;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.registerData.email)) {
      console.log('❌ Validation failed: Invalid email format');
      this.registrationError = true;
      this.messageText = 'Prosimo, vnesite veljaven email naslov.';
      return false;
    }

    if (!this.registerData.agreeToTerms) {
      console.log('❌ Validation failed: Terms not agreed');
      this.registrationError = true;
      this.messageText = 'Morate se strinjati s pogoji uporabe.';
      return false;
    }

    console.log('✅ Registration form validation passed');
    return true;
  }

  forgotPassword() {
    console.log('🔑 Forgot password requested');
    const email = prompt('Vnesite vaš email naslov:');
    if (email) {
      console.log('📧 Password reset requested for email:', email);
      // TODO: Implement forgot password logic
      alert('Navodila za ponastavitev gesla so bila poslana na vaš email.');
    } else {
      console.log('❌ Password reset cancelled - no email provided');
    }
  }
}
