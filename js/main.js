// Learnrail Landing Page JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Load pricing plans from API
    loadPricingPlans();
    // Mobile menu toggle
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const navLinks = document.getElementById('navLinks');

    if (mobileMenuBtn && navLinks) {
        mobileMenuBtn.addEventListener('click', function() {
            navLinks.classList.toggle('active');
            const icon = mobileMenuBtn.querySelector('i');
            if (navLinks.classList.contains('active')) {
                icon.classList.remove('fa-bars');
                icon.classList.add('fa-times');
            } else {
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
            }
        });
    }

    // Navbar scroll effect
    const navbar = document.getElementById('navbar');

    window.addEventListener('scroll', function() {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
                // Close mobile menu if open
                navLinks.classList.remove('active');
                const icon = mobileMenuBtn.querySelector('i');
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
            }
        });
    });

    // Animate elements on scroll
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Observe elements for animation
    document.querySelectorAll('.feature-card, .step, .pricing-card, .testimonial-card').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });

    // Add animation class styles
    const style = document.createElement('style');
    style.textContent = `
        .animate-in {
            opacity: 1 !important;
            transform: translateY(0) !important;
        }
    `;
    document.head.appendChild(style);

    // Counter animation for stats
    function animateValue(element, start, end, duration) {
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            const value = Math.floor(progress * (end - start) + start);
            element.textContent = value.toLocaleString() + (element.dataset.suffix || '');
            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };
        window.requestAnimationFrame(step);
    }

    // Animate stats when visible
    const statsObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const statNumbers = entry.target.querySelectorAll('.stat-number');
                statNumbers.forEach(stat => {
                    const text = stat.textContent;
                    const number = parseInt(text.replace(/[^0-9]/g, ''));
                    const suffix = text.replace(/[0-9]/g, '');
                    stat.dataset.suffix = suffix;
                    animateValue(stat, 0, number, 2000);
                });
                statsObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    const heroStats = document.querySelector('.hero-stats');
    if (heroStats) {
        statsObserver.observe(heroStats);
    }
});

// Fetch and render pricing plans from API
async function loadPricingPlans() {
    const freePlanCard = document.getElementById('free-plan-card');
    const pricingCards = document.getElementById('pricing-cards');
    if (!freePlanCard || !pricingCards) return;

    try {
        const response = await fetch('https://api.learnrail.org/api/subscription-plans');
        const result = await response.json();

        if (result.success && result.data && result.data.length > 0) {
            // Sort plans: show popular first in middle, then by price
            const plans = result.data.sort((a, b) => {
                if (a.is_popular && !b.is_popular) return -1;
                if (!a.is_popular && b.is_popular) return 1;
                return a.price - b.price;
            });

            // Take plans to display (we already have the free plan, so show up to 2 more for 3 total)
            const displayPlans = plans.slice(0, 2);

            // Insert plans in reverse order so they appear correctly (afterend inserts before previous)
            displayPlans.slice().reverse().forEach((plan, index) => {
                const isFeatured = plan.is_popular || (displayPlans.length - 1 - index === 0 && displayPlans.length > 1);
                const cardHtml = createPlanCard(plan, isFeatured);
                freePlanCard.insertAdjacentHTML('afterend', cardHtml);
            });

            // Re-observe new cards for animation
            document.querySelectorAll('.pricing-card.dynamic').forEach(el => {
                el.style.opacity = '0';
                el.style.transform = 'translateY(20px)';
                el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
                setTimeout(() => {
                    el.classList.add('animate-in');
                }, 100);
            });
        }
    } catch (error) {
        console.error('Failed to load pricing plans:', error);
        // Show fallback static plans
        showFallbackPlans(freePlanCard);
    }
}

// Select best plans to display (max 2, since we already show free)
function selectDisplayPlans(plans) {
    if (plans.length <= 2) return plans;

    // Convert duration_days to approximate months for comparison
    const getDurationMonths = (plan) => {
        const days = plan.duration_days || 30;
        return Math.round(days / 30);
    };

    // Try to get: one quarterly/monthly, one biannual, one annual
    const monthly = plans.find(p => getDurationMonths(p) === 1);
    const quarterly = plans.find(p => getDurationMonths(p) === 3);
    const biannual = plans.find(p => getDurationMonths(p) === 6);
    const annual = plans.find(p => getDurationMonths(p) === 12);
    const popular = plans.find(p => p.is_popular);

    // Prioritize popular plan and mix of durations
    const selected = [];

    // Add shorter term plan
    if (quarterly) selected.push(quarterly);
    else if (monthly) selected.push(monthly);

    // Add popular or medium term
    if (popular && !selected.includes(popular)) selected.push(popular);
    else if (biannual && !selected.includes(biannual)) selected.push(biannual);

    // Add annual
    if (annual && !selected.includes(annual)) selected.push(annual);

    // Fill remaining slots
    while (selected.length < 2 && plans.length > selected.length) {
        const remaining = plans.find(p => !selected.includes(p));
        if (remaining) selected.push(remaining);
        else break;
    }

    return selected.slice(0, 2);
}

// Create a pricing card HTML
function createPlanCard(plan, isFeatured = false) {
    const period = getPeriodText(plan.duration_days);
    const savings = plan.original_price ? Math.round((1 - plan.price / plan.original_price) * 100) : 0;

    // Handle currency - default to NGN/N if not provided
    let currencySymbol = 'N';
    if (plan.currency) {
        currencySymbol = plan.currency === 'NGN' ? 'N' : (plan.currency === 'USD' ? '$' : plan.currency);
    }

    let featuresHtml = '';
    if (plan.features && plan.features.length > 0) {
        plan.features.forEach(feature => {
            featuresHtml += `<li><i class="fas fa-check"></i> ${escapeHtml(feature)}</li>`;
        });
    } else {
        // Default features based on plan type
        featuresHtml = getDefaultFeatures(plan);
    }

    return `
        <div class="pricing-card dynamic ${isFeatured || plan.is_popular ? 'featured' : ''}">
            ${plan.is_popular ? '<div class="popular-badge">Most Popular</div>' : ''}
            <div class="pricing-header">
                <h3>${escapeHtml(plan.name)}</h3>
                <div class="price">
                    <span class="currency">${currencySymbol}</span>
                    <span class="amount">${formatNumber(plan.price)}</span>
                    <span class="period">/${period}</span>
                </div>
                ${savings > 0 ? `<span class="savings">Save ${savings}%</span>` : ''}
            </div>
            <ul class="pricing-features">
                ${featuresHtml}
            </ul>
            <a href="https://app.learnrail.org/subscription/payment/${plan.id}" class="btn ${isFeatured || plan.is_popular ? 'btn-primary' : 'btn-outline'} btn-block">
                Start ${plan.name} Plan
            </a>
        </div>
    `;
}

// Get period text from duration days
function getPeriodText(days) {
    if (!days) return 'month';
    const months = Math.round(days / 30);
    switch(months) {
        case 1: return 'month';
        case 3: return '3 months';
        case 6: return '6 months';
        case 12: return 'year';
        default: return `${months} months`;
    }
}

// Get default features based on plan
function getDefaultFeatures(plan) {
    let features = '<li><i class="fas fa-check"></i> Access to all courses</li>';
    features += '<li><i class="fas fa-check"></i> Progress tracking</li>';
    features += '<li><i class="fas fa-check"></i> Course certificates</li>';

    if (plan.includes_goal_tracker) {
        features += '<li><i class="fas fa-check"></i> Goal tracking</li>';
    } else {
        features += '<li class="disabled"><i class="fas fa-times"></i> Goal tracking</li>';
    }

    if (plan.includes_accountability_partner) {
        features += '<li><i class="fas fa-check"></i> Accountability partner</li>';
    } else {
        features += '<li class="disabled"><i class="fas fa-times"></i> Accountability partner</li>';
    }

    return features;
}

// Format number with commas
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Show fallback static plans if API fails
function showFallbackPlans(freePlanCard) {
    // Insert annual plan first (it will appear last due to afterend)
    freePlanCard.insertAdjacentHTML('afterend', `
        <div class="pricing-card dynamic">
            <div class="pricing-header">
                <h3>Annual</h3>
                <div class="price">
                    <span class="currency">N</span>
                    <span class="amount">35,000</span>
                    <span class="period">/year</span>
                </div>
                <span class="savings">Save 40%</span>
            </div>
            <ul class="pricing-features">
                <li><i class="fas fa-check"></i> Everything in Quarterly</li>
                <li><i class="fas fa-check"></i> Accountability partner</li>
                <li><i class="fas fa-check"></i> Priority support</li>
                <li><i class="fas fa-check"></i> AI Tutor access</li>
                <li><i class="fas fa-check"></i> Offline access</li>
                <li><i class="fas fa-check"></i> Custom learning paths</li>
            </ul>
            <a href="https://app.learnrail.org/subscription" class="btn btn-outline btn-block">Start Annual Plan</a>
        </div>
    `);

    // Insert quarterly plan (will appear in the middle)
    freePlanCard.insertAdjacentHTML('afterend', `
        <div class="pricing-card featured dynamic">
            <div class="popular-badge">Most Popular</div>
            <div class="pricing-header">
                <h3>Quarterly</h3>
                <div class="price">
                    <span class="currency">N</span>
                    <span class="amount">13,000</span>
                    <span class="period">/3 months</span>
                </div>
            </div>
            <ul class="pricing-features">
                <li><i class="fas fa-check"></i> All courses included</li>
                <li><i class="fas fa-check"></i> Advanced AI tutor</li>
                <li><i class="fas fa-check"></i> Verified certificates</li>
                <li><i class="fas fa-check"></i> Goal tracking</li>
                <li><i class="fas fa-check"></i> Progress analytics</li>
                <li class="disabled"><i class="fas fa-times"></i> Accountability partner</li>
            </ul>
            <a href="https://app.learnrail.org/subscription" class="btn btn-primary btn-block">Start 3-Month Plan</a>
        </div>
    `);
}
