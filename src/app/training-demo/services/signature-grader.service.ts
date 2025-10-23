import { Injectable } from '@angular/core';

export interface SignatureRequirements {
  hasLogo: boolean;
  hasName: boolean;
  hasTitle: boolean;
  hasCompany: boolean;
  hasPhone: boolean;
  hasEmail: boolean;
  hasWebsite: boolean;
  hasCorrectPhoneLink: boolean;
  hasCorrectEmailLink: boolean;
  hasCorrectWebsiteLink: boolean;
  hasBoldName: boolean;
  hasBrandColor: boolean;
  hasProperLayout: boolean;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export interface GradingResult {
  score: number;
  maxScore: number;
  percentage: number;
  feedback: string[];
  requirements: SignatureRequirements;
  passed: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class SignatureGraderService {
  
  private readonly QUIZ_QUESTIONS: QuizQuestion[] = [
    {
      id: 'q1',
      question: 'What is the recommended maximum number of lines for a professional email signature?',
      options: ['2-3 lines', '4-6 lines', '7-10 lines', 'No limit'],
      correctAnswer: 1,
      explanation: 'Professional email signatures should be concise, typically 4-6 lines to maintain readability.'
    },
    {
      id: 'q2',
      question: 'Which HTML tag should be used for phone number links in email signatures?',
      options: ['<a href="tel:">', '<a href="phone:">', '<a href="call:">', '<a href="number:">'],
      correctAnswer: 0,
      explanation: 'The tel: scheme is the standard for phone number links in HTML.'
    },
    {
      id: 'q3',
      question: 'What is the best practice for including social media links in email signatures?',
      options: ['Include all social platforms', 'Include only 1-2 most relevant', 'Never include social media', 'Use text-only links'],
      correctAnswer: 1,
      explanation: 'Include only 1-2 most relevant social media platforms to keep the signature clean and professional.'
    },
    {
      id: 'q4',
      question: 'Which color scheme is most appropriate for professional email signatures?',
      options: ['Bright, vibrant colors', 'Company brand colors', 'Black and white only', 'Rainbow colors'],
      correctAnswer: 1,
      explanation: 'Use company brand colors to maintain consistency with your organization\'s visual identity.'
    },
    {
      id: 'q5',
      question: 'What should you avoid including in professional email signatures?',
      options: ['Company logo', 'Contact information', 'Personal quotes or jokes', 'Professional title'],
      correctAnswer: 2,
      explanation: 'Avoid personal quotes, jokes, or casual language in professional email signatures.'
    }
  ];

  /**
   * Grade the email signature based on requirements
   */
  gradeSignature(signatureHtml: string): GradingResult {
    const requirements = this.checkSignatureRequirements(signatureHtml);
    const score = this.calculateScore(requirements);
    const maxScore = Object.keys(requirements).length;
    const percentage = Math.round((score / maxScore) * 100);
    const feedback = this.generateFeedback(requirements);
    const passed = percentage >= 70; // 70% passing grade

    return {
      score,
      maxScore,
      percentage,
      feedback,
      requirements,
      passed
    };
  }

  /**
   * Grade the quiz answers
   */
  gradeQuiz(answers: { [questionId: string]: number }): { score: number; maxScore: number; percentage: number; results: any[] } {
    let correct = 0;
    const results = this.QUIZ_QUESTIONS.map(question => {
      const userAnswer = answers[question.id];
      const isCorrect = userAnswer === question.correctAnswer;
      if (isCorrect) correct++;
      
      return {
        question,
        userAnswer,
        isCorrect,
        explanation: question.explanation
      };
    });

    const maxScore = this.QUIZ_QUESTIONS.length;
    const percentage = Math.round((correct / maxScore) * 100);

    return {
      score: correct,
      maxScore,
      percentage,
      results
    };
  }

  /**
   * Get quiz questions
   */
  getQuizQuestions(): QuizQuestion[] {
    return this.QUIZ_QUESTIONS;
  }

  /**
   * Check signature requirements
   */
  private checkSignatureRequirements(html: string): SignatureRequirements {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    
    return {
      hasLogo: this.hasLogo(doc),
      hasName: this.hasName(doc),
      hasTitle: this.hasTitle(doc),
      hasCompany: this.hasCompany(doc),
      hasPhone: this.hasPhone(doc),
      hasEmail: this.hasEmail(doc),
      hasWebsite: this.hasWebsite(doc),
      hasCorrectPhoneLink: this.hasCorrectPhoneLink(doc),
      hasCorrectEmailLink: this.hasCorrectEmailLink(doc),
      hasCorrectWebsiteLink: this.hasCorrectWebsiteLink(doc),
      hasBoldName: this.hasBoldName(doc),
      hasBrandColor: this.hasBrandColor(doc),
      hasProperLayout: this.hasProperLayout(doc)
    };
  }

  /**
   * Calculate score based on requirements
   */
  private calculateScore(requirements: SignatureRequirements): number {
    return Object.values(requirements).filter(Boolean).length;
  }

  /**
   * Generate feedback based on requirements
   */
  private generateFeedback(requirements: SignatureRequirements): string[] {
    const feedback: string[] = [];
    
    if (!requirements.hasLogo) feedback.push('❌ Missing company logo');
    if (!requirements.hasName) feedback.push('❌ Missing your name');
    if (!requirements.hasTitle) feedback.push('❌ Missing job title');
    if (!requirements.hasCompany) feedback.push('❌ Missing company name');
    if (!requirements.hasPhone) feedback.push('❌ Missing phone number');
    if (!requirements.hasEmail) feedback.push('❌ Missing email address');
    if (!requirements.hasWebsite) feedback.push('❌ Missing website URL');
    if (!requirements.hasCorrectPhoneLink) feedback.push('❌ Phone number should use tel: link');
    if (!requirements.hasCorrectEmailLink) feedback.push('❌ Email should use mailto: link');
    if (!requirements.hasCorrectWebsiteLink) feedback.push('❌ Website should use https: link');
    if (!requirements.hasBoldName) feedback.push('❌ Your name should be bold');
    if (!requirements.hasBrandColor) feedback.push('❌ Use company brand color');
    if (!requirements.hasProperLayout) feedback.push('❌ Improve layout (logo left, text right)');

    // Add positive feedback for met requirements
    if (requirements.hasLogo) feedback.push('✅ Company logo included');
    if (requirements.hasName) feedback.push('✅ Name included');
    if (requirements.hasTitle) feedback.push('✅ Job title included');
    if (requirements.hasCompany) feedback.push('✅ Company name included');
    if (requirements.hasPhone) feedback.push('✅ Phone number included');
    if (requirements.hasEmail) feedback.push('✅ Email address included');
    if (requirements.hasWebsite) feedback.push('✅ Website URL included');
    if (requirements.hasCorrectPhoneLink) feedback.push('✅ Correct phone link format');
    if (requirements.hasCorrectEmailLink) feedback.push('✅ Correct email link format');
    if (requirements.hasCorrectWebsiteLink) feedback.push('✅ Correct website link format');
    if (requirements.hasBoldName) feedback.push('✅ Name is bold');
    if (requirements.hasBrandColor) feedback.push('✅ Brand color used');
    if (requirements.hasProperLayout) feedback.push('✅ Good layout structure');

    return feedback;
  }

  // Helper methods for checking requirements
  private hasLogo(doc: Document): boolean {
    const images = doc.querySelectorAll('img');
    return images.length > 0;
  }

  private hasName(doc: Document): boolean {
    const text = doc.body.textContent?.toLowerCase() || '';
    return text.includes('john') || text.includes('jane') || text.includes('name');
  }

  private hasTitle(doc: Document): boolean {
    const text = doc.body.textContent?.toLowerCase() || '';
    return text.includes('manager') || text.includes('director') || text.includes('specialist') || text.includes('title');
  }

  private hasCompany(doc: Document): boolean {
    const text = doc.body.textContent?.toLowerCase() || '';
    return text.includes('company') || text.includes('corp') || text.includes('inc') || text.includes('ltd');
  }

  private hasPhone(doc: Document): boolean {
    const text = doc.body.textContent || '';
    const phoneRegex = /\(\d{3}\)\s\d{3}-\d{4}|\d{3}-\d{3}-\d{4}|\d{10}/;
    return phoneRegex.test(text);
  }

  private hasEmail(doc: Document): boolean {
    const text = doc.body.textContent || '';
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    return emailRegex.test(text);
  }

  private hasWebsite(doc: Document): boolean {
    const text = doc.body.textContent?.toLowerCase() || '';
    return text.includes('www.') || text.includes('http') || text.includes('.com') || text.includes('.org');
  }

  private hasCorrectPhoneLink(doc: Document): boolean {
    const phoneLinks = doc.querySelectorAll('a[href^="tel:"]');
    return phoneLinks.length > 0;
  }

  private hasCorrectEmailLink(doc: Document): boolean {
    const emailLinks = doc.querySelectorAll('a[href^="mailto:"]');
    return emailLinks.length > 0;
  }

  private hasCorrectWebsiteLink(doc: Document): boolean {
    const websiteLinks = doc.querySelectorAll('a[href^="https:"]');
    return websiteLinks.length > 0;
  }

  private hasBoldName(doc: Document): boolean {
    const boldElements = doc.querySelectorAll('b, strong');
    return boldElements.length > 0;
  }

  private hasBrandColor(doc: Document): boolean {
    const elements = doc.querySelectorAll('*');
    for (let element of Array.from(elements)) {
      const style = (element as HTMLElement).style;
      if (style.color && (style.color.includes('#') || style.color.includes('rgb'))) {
        return true;
      }
    }
    return false;
  }

  private hasProperLayout(doc: Document): boolean {
    // Check for table or div structure that suggests proper layout
    const tables = doc.querySelectorAll('table');
    const divs = doc.querySelectorAll('div');
    return tables.length > 0 || divs.length > 0;
  }
}
