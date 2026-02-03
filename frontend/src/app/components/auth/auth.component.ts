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
    phoneNumber: '',
    address: '',
    postalCode: '',
    city: '',
    agreeToTerms: false
  };

  constructor(
    private router: Router,
    private authService: UserService
  ) {}

  toggleMode() {
    this.isLoginMode = !this.isLoginMode;
    this.clearForms();
  }

  clearForms() {
    this.loginData = { email: '', password: '' };
    this.registerData = {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      phoneNumber: '',
      address: '',
      postalCode: '',
      city: '',
      agreeToTerms: false
    };
    // Clear all message flags
    this.clearMessages();
  }

  clearMessages() {
    this.loginSuccess = false;
    this.loginError = false;
    this.registrationSuccess = false;
    this.registrationError = false;
    this.messageText = '';
  }

  onLogin() {
    this.clearMessages();

    if (this.loginData.email && this.loginData.password) {

      this.authService.login(this.loginData.email, this.loginData.password)
        .subscribe({
          next: (res) => {
            if (res.success) {
              this.loginSuccess = true;
              this.messageText = 'Uspešno ste se prijavili! Preusmerjamo vas...';

              // Redirect after a short delay to show the success message
              setTimeout(() => {
                this.router.navigate(['/']);
              }, 1500);
            } else {
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
      this.loginError = true;
      this.messageText = 'Prosimo, izpolnite vsa polja.';
    }
  }

  onRegister() {
    this.clearMessages();

    if (this.validateRegistration()) {
      this.authService.register(this.registerData).subscribe({
        next: (res) => {

          if (res.user) {
            this.registrationSuccess = true;
            this.messageText = res.message || 'Uspešno ste se registrirali! Preusmerjamo vas na prijavo...';

            // Switch to login mode after a short delay
            setTimeout(() => {
              this.isLoginMode = true;
              this.clearForms();
            }, 2000);
          } else {
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
    }  }

  validateRegistration(): boolean {
    if (!this.registerData.firstName || !this.registerData.lastName ||
      !this.registerData.email || !this.registerData.password ||
      !this.registerData.confirmPassword || !this.registerData.phoneNumber ||
      !this.registerData.address || !this.registerData.postalCode ||
      !this.registerData.city) {
      this.registrationError = true;
      this.messageText = 'Prosimo, izpolnite vsa polja.';
      return false;
    }

    if (this.registerData.password !== this.registerData.confirmPassword) {
      this.registrationError = true;
      this.messageText = 'Gesli se ne ujemata.';
      return false;
    }

    if (this.registerData.password.length < 6) {
      this.registrationError = true;
      this.messageText = 'Geslo mora imeti vsaj 6 znakov.';
      return false;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.registerData.email)) {
      this.registrationError = true;
      this.messageText = 'Prosimo, vnesite veljaven email naslov.';
      return false;
    }

    // Slovenian phone number validation (9 digits starting with 0, spaces allowed)
    const cleaned = this.registerData.phoneNumber.replace(/\s/g, '');
    if (!/^0\d{8}$/.test(cleaned)) {
      this.registrationError = true;
      this.messageText = 'Telefonska številka mora imeti 9 številk in se začeti z 0 (npr. 051234567 ali 051 234 567).';
      return false;
    }

    // Slovenian postal code validation (4 digits, 1000-9999)
    const postalCodeRegex = /^[1-9]\d{3}$/;
    if (!postalCodeRegex.test(this.registerData.postalCode)) {
      this.registrationError = true;
      this.messageText = 'Prosimo, vnesite veljavno slovensko poštno številko (4 številke, 1000-9999).';
      return false;
    }

    // Address validation (minimum 5 characters)
    if (this.registerData.address.length < 5) {
      this.registrationError = true;
      this.messageText = 'Naslov mora imeti vsaj 5 znakov.';
      return false;
    }

    // City validation (minimum 2 characters)
    if (this.registerData.city.length < 2) {
      this.registrationError = true;
      this.messageText = 'Ime kraja mora imeti vsaj 2 znaka.';
      return false;
    }

    if (!this.registerData.agreeToTerms) {
      this.registrationError = true;
      this.messageText = 'Morate se strinjati s pogoji uporabe.';
      return false;
    }

    return true;
  }

  forgotPassword() {
    const email = prompt('Vnesite vaš email naslov:');
    if (email) {
      // TODO: Implement forgot password logic
      alert('Navodila za ponastavitev gesla so bila poslana na vaš email.');
    }
  }
}
