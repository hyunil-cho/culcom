/**
 * Modal Utility Library
 * 공통 모달 컴포넌트 관리 유틸리티
 */

// 모달 매니저
const ModalManager = {
    modals: new Map(),
    
    /**
     * 기본 모달 생성
     * @param {Object} options - 모달 옵션
     * @param {string} options.id - 모달 ID
     * @param {string} options.title - 모달 제목
     * @param {string} options.content - 모달 본문 HTML
     * @param {Array} options.buttons - 버튼 배열 [{text, class, onClick}]
     * @param {string} options.maxWidth - 최대 너비 (기본: 500px)
     * @param {string} options.headerColor - 헤더 하단 border 색상
     * @param {boolean} options.closeOnOverlay - 배경 클릭시 닫기 (기본: true)
     * @returns {HTMLElement} 생성된 모달 엘리먼트
     */
    create(options) {
        const {
            id,
            title,
            content,
            buttons = [],
            maxWidth = '500px',
            headerColor = '#4a90e2',
            closeOnOverlay = true,
            showCloseButton = false
        } = options;

        // 기존 모달이 있으면 제거
        const existing = document.getElementById(id);
        if (existing) {
            existing.remove();
        }

        // 모달 컨테이너 생성
        const modal = document.createElement('div');
        modal.id = id;
        modal.className = 'modal';
        modal.style.display = 'none';

        // 모달 컨텐츠 생성
        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        modalContent.style.maxWidth = maxWidth;

        // 헤더 생성
        const header = document.createElement('div');
        header.className = 'modal-header';
        header.style.borderBottom = `2px solid ${headerColor}`;
        
        const titleElement = document.createElement('h3');
        titleElement.textContent = title;
        header.appendChild(titleElement);

        // 닫기 버튼 추가 (옵션)
        if (showCloseButton) {
            const closeBtn = document.createElement('span');
            closeBtn.className = 'modal-close';
            closeBtn.innerHTML = '&times;';
            closeBtn.onclick = () => this.hide(id);
            header.appendChild(closeBtn);
        }

        // 본문 생성
        const body = document.createElement('div');
        body.className = 'modal-body';
        body.style.padding = '2rem';
        if (typeof content === 'string') {
            body.innerHTML = content;
        } else if (content instanceof HTMLElement) {
            body.appendChild(content);
        }

        // 푸터 생성 (버튼이 있을 경우)
        let footer = null;
        if (buttons.length > 0) {
            footer = document.createElement('div');
            footer.style.padding = '1rem 2rem';
            footer.style.borderTop = '1px solid #e0e0e0';
            footer.style.display = 'flex';
            footer.style.gap = '0.75rem';

            buttons.forEach(btn => {
                const button = document.createElement('button');
                button.className = btn.class || 'btn-secondary';
                button.textContent = btn.text;
                button.style.flex = '1';
                button.style.padding = '0.75rem';
                button.style.fontSize = '1rem';
                if (btn.style) {
                    Object.assign(button.style, btn.style);
                }
                button.onclick = (e) => {
                    if (btn.onClick) {
                        btn.onClick(e, this);
                    }
                    if (btn.closeOnClick !== false) {
                        this.hide(id);
                    }
                };
                footer.appendChild(button);
            });
        }

        // 조립
        modalContent.appendChild(header);
        modalContent.appendChild(body);
        if (footer) {
            modalContent.appendChild(footer);
        }
        modal.appendChild(modalContent);

        // 배경 클릭 이벤트
        if (closeOnOverlay) {
            modal.onclick = (e) => {
                if (e.target === modal) {
                    this.hide(id);
                }
            };
        }

        // DOM에 추가
        document.body.appendChild(modal);
        this.modals.set(id, modal);

        return modal;
    },

    /**
     * 확인 모달 생성 (확인/취소 버튼)
     * @param {Object} options
     * @param {string} options.id - 모달 ID
     * @param {string} options.title - 제목
     * @param {string} options.message - 메시지
     * @param {Function} options.onConfirm - 확인 버튼 콜백
     * @param {Function} options.onCancel - 취소 버튼 콜백
     * @param {string} options.confirmText - 확인 버튼 텍스트 (기본: "확인")
     * @param {string} options.cancelText - 취소 버튼 텍스트 (기본: "취소")
     * @param {string} options.confirmColor - 확인 버튼 배경색
     */
    createConfirm(options) {
        const {
            id,
            title,
            message,
            onConfirm,
            onCancel,
            confirmText = '확인',
            cancelText = '취소',
            confirmColor = '#4a90e2',
            maxWidth = '400px'
        } = options;

        const content = `
            <div style="text-align: center; color: #666; font-size: 0.95rem;">
                ${message}
            </div>
        `;

        const buttons = [
            {
                text: cancelText,
                class: 'btn-secondary',
                onClick: onCancel
            },
            {
                text: confirmText,
                class: 'btn-primary',
                style: { background: confirmColor },
                onClick: onConfirm
            }
        ];

        return this.create({
            id,
            title,
            content,
            buttons,
            maxWidth,
            headerColor: confirmColor
        });
    },

    /**
     * 알림 모달 생성 (확인 버튼만)
     * @param {Object} options
     * @param {string} options.id - 모달 ID
     * @param {string} options.title - 제목
     * @param {string} options.message - 메시지
     * @param {Function} options.onConfirm - 확인 버튼 콜백
     * @param {string} options.confirmText - 확인 버튼 텍스트 (기본: "확인")
     */
    createAlert(options) {
        const {
            id,
            title,
            message,
            onConfirm,
            confirmText = '확인',
            confirmColor = '#10b981',
            maxWidth = '400px'
        } = options;

        const buttons = [
            {
                text: confirmText,
                class: 'btn-primary',
                style: { background: confirmColor },
                onClick: onConfirm
            }
        ];

        return this.create({
            id,
            title,
            content: message,
            buttons,
            maxWidth,
            headerColor: confirmColor
        });
    },

    /**
     * 커스텀 모달 생성 (자유로운 컨텐츠 + 버튼)
     * @param {Object} options
     * @param {string} options.id - 모달 ID
     * @param {string} options.title - 제목
     * @param {string|Function} options.contentBuilder - HTML 문자열 또는 DOM 생성 함수
     * @param {Array} options.buttons - 버튼 배열
     */
    createCustom(options) {
        const {
            id,
            title,
            contentBuilder,
            buttons = [],
            maxWidth = '600px',
            headerColor = '#4a90e2',
            showCloseButton = true
        } = options;

        let content;
        if (typeof contentBuilder === 'function') {
            content = contentBuilder();
        } else {
            content = contentBuilder;
        }

        return this.create({
            id,
            title,
            content,
            buttons,
            maxWidth,
            headerColor,
            showCloseButton
        });
    },

    /**
     * 모달 표시
     * @param {string} id - 모달 ID
     */
    show(id) {
        const modal = this.modals.get(id) || document.getElementById(id);
        if (modal) {
            modal.style.display = 'flex';
        }
    },

    /**
     * 모달 숨김
     * @param {string} id - 모달 ID
     */
    hide(id) {
        const modal = this.modals.get(id) || document.getElementById(id);
        if (modal) {
            modal.style.display = 'none';
        }
    },

    /**
     * 모달 제거
     * @param {string} id - 모달 ID
     */
    destroy(id) {
        const modal = this.modals.get(id) || document.getElementById(id);
        if (modal) {
            modal.remove();
            this.modals.delete(id);
        }
    },

    /**
     * 모든 모달 닫기
     */
    hideAll() {
        this.modals.forEach((modal) => {
            modal.style.display = 'none';
        });
    }
};

// 전역으로 export
window.ModalManager = ModalManager;

// 편의 함수들
window.showModal = (id) => ModalManager.show(id);
window.hideModal = (id) => ModalManager.hide(id);
window.createConfirmModal = (options) => ModalManager.createConfirm(options);
window.createAlertModal = (options) => ModalManager.createAlert(options);
window.createCustomModal = (options) => ModalManager.createCustom(options);
