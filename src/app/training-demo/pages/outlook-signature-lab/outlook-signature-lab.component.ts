import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { SignatureGraderService, GradingResult, QuizQuestion } from '../../services/signature-grader.service';

@Component({
  selector: 'app-outlook-signature-lab',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './outlook-signature-lab.component.html',
  styleUrls: ['./outlook-signature-lab.component.scss']
})
export class OutlookSignatureLabComponent implements OnInit {
  
  // Form for signature builder
  signatureForm: FormGroup;
  
  // Quiz form
  quizForm: FormGroup;
  
  // Current step in the lab
  currentStep: 'instructions' | 'builder' | 'quiz' | 'results' = 'instructions';
  
  // Signature HTML
  signatureHtml: string = '';
  
  // Grading results
  signatureGrade: GradingResult | null = null;
  quizGrade: any = null;
  
  // Quiz questions
  quizQuestions: QuizQuestion[] = [];
  
  // Lab completion status
  isCompleted: boolean = false;
  totalScore: number = 0;
  
  // Sample signature template
  sampleSignature = `
<table cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
  <tr>
    <td style="padding-right: 15px; vertical-align: top;">
      <img src="https://via.placeholder.com/80x40/0066CC/FFFFFF?text=LOGO" alt="Company Logo" style="max-width: 80px; height: auto;">
    </td>
    <td style="vertical-align: top;">
      <div style="font-family: Arial, sans-serif; font-size: 12px; color: #333333;">
        <strong style="color: #0066CC;">John Smith</strong><br>
        Marketing Manager<br>
        <span style="color: #666666;">Acme Corporation</span><br>
        <a href="tel:+1234567890" style="color: #0066CC; text-decoration: none;">(123) 456-7890</a><br>
        <a href="mailto:john.smith@acme.com" style="color: #0066CC; text-decoration: none;">john.smith@acme.com</a><br>
        <a href="https://www.acme.com" style="color: #0066CC; text-decoration: none;">www.acme.com</a>
      </div>
    </td>
  </tr>
</table>
  `;

  constructor(
    private fb: FormBuilder,
    private graderService: SignatureGraderService
  ) {
    this.signatureForm = this.fb.group({
      name: ['John Smith', Validators.required],
      title: ['Marketing Manager', Validators.required],
      company: ['Acme Corporation', Validators.required],
      phone: ['(123) 456-7890', Validators.required],
      email: ['john.smith@acme.com', Validators.required],
      website: ['www.acme.com', Validators.required],
      logoUrl: ['https://via.placeholder.com/80x40/0066CC/FFFFFF?text=LOGO', Validators.required]
    });

    this.quizForm = this.fb.group({});
  }

  ngOnInit(): void {
    this.quizQuestions = this.graderService.getQuizQuestions();
    this.initializeQuizForm();
    this.generateSignature();
  }

  /**
   * Initialize quiz form with all questions
   */
  private initializeQuizForm(): void {
    const formControls: { [key: string]: any } = {};
    this.quizQuestions.forEach(question => {
      formControls[question.id] = [null, Validators.required];
    });
    this.quizForm = this.fb.group(formControls);
  }

  /**
   * Generate signature HTML from form data
   */
  generateSignature(): void {
    const formValue = this.signatureForm.value;
    
    this.signatureHtml = `
<table cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
  <tr>
    <td style="padding-right: 15px; vertical-align: top;">
      <img src="${formValue.logoUrl}" alt="Company Logo" style="max-width: 80px; height: auto;">
    </td>
    <td style="vertical-align: top;">
      <div style="font-family: Arial, sans-serif; font-size: 12px; color: #333333;">
        <strong style="color: #0066CC;">${formValue.name}</strong><br>
        ${formValue.title}<br>
        <span style="color: #666666;">${formValue.company}</span><br>
        <a href="tel:${formValue.phone.replace(/[^\d]/g, '')}" style="color: #0066CC; text-decoration: none;">${formValue.phone}</a><br>
        <a href="mailto:${formValue.email}" style="color: #0066CC; text-decoration: none;">${formValue.email}</a><br>
        <a href="https://${formValue.website}" style="color: #0066CC; text-decoration: none;">${formValue.website}</a>
      </div>
    </td>
  </tr>
</table>
    `;
  }

  /**
   * Grade the signature
   */
  gradeSignature(): void {
    this.signatureGrade = this.graderService.gradeSignature(this.signatureHtml);
    this.currentStep = 'quiz';
  }

  /**
   * Submit quiz
   */
  submitQuiz(): void {
    if (this.quizForm.valid) {
      this.quizGrade = this.graderService.gradeQuiz(this.quizForm.value);
      this.calculateTotalScore();
      this.currentStep = 'results';
      this.isCompleted = true;
    }
  }

  /**
   * Calculate total score
   */
  private calculateTotalScore(): void {
    const signatureScore = this.signatureGrade?.percentage || 0;
    const quizScore = this.quizGrade?.percentage || 0;
    this.totalScore = Math.round((signatureScore + quizScore) / 2);
  }

  /**
   * Reset the lab
   */
  resetLab(): void {
    this.currentStep = 'instructions';
    this.signatureGrade = null;
    this.quizGrade = null;
    this.isCompleted = false;
    this.totalScore = 0;
    this.quizForm.reset();
    this.signatureForm.reset({
      name: 'John Smith',
      title: 'Marketing Manager',
      company: 'Acme Corporation',
      phone: '(123) 456-7890',
      email: 'john.smith@acme.com',
      website: 'www.acme.com',
      logoUrl: 'https://via.placeholder.com/80x40/0066CC/FFFFFF?text=LOGO'
    });
    this.generateSignature();
  }

  /**
   * Copy signature to clipboard
   */
  copySignature(): void {
    navigator.clipboard.writeText(this.signatureHtml).then(() => {
      alert('Signature copied to clipboard!');
    });
  }

  /**
   * Get step progress percentage
   */
  getStepProgress(): number {
    switch (this.currentStep) {
      case 'instructions': return 25;
      case 'builder': return 50;
      case 'quiz': return 75;
      case 'results': return 100;
      default: return 0;
    }
  }

  /**
   * Get grade color class
   */
  getGradeColorClass(percentage: number): string {
    if (percentage >= 90) return 'grade-excellent';
    if (percentage >= 80) return 'grade-good';
    if (percentage >= 70) return 'grade-pass';
    return 'grade-fail';
  }

  /**
   * Get grade label
   */
  getGradeLabel(percentage: number): string {
    if (percentage >= 90) return 'Excellent';
    if (percentage >= 80) return 'Good';
    if (percentage >= 70) return 'Pass';
    return 'Needs Improvement';
  }
}
