import {
	forwardRef,
	useCallback,
	useEffect,
	useImperativeHandle,
	useMemo,
	useRef,
	useState
} from 'react';
import {
	FaChevronUp,
	FaChevronDown,
	FaChevronLeft,
	FaChevronRight,
	FaCheck,
	FaTimes
} from 'react-icons/fa';
import { BsQuestionCircleFill } from 'react-icons/bs';
import { css } from '@emotion/core';
import Tippy from '@tippyjs/react';

import { QuestionChoices, QuestionPrompt } from '@soomo/lib/components/shared/Question';
import shuffle from '@soomo/lib/utils/shuffle';

import type { FamilyId } from '@soomo/lib/types/WebtextManifest';
import type { SaveMCQuestionResponse } from '../pages/api/save_sqr_mc_question';
import type { SQRQuestionPool } from '../fixtures/sqrQuestionPools';

const pivotarIconProps = {
	size: 21,
	css: css`
		color: #5f01df;
	`,
	'aria-hidden': 'true' as const
};

interface Props {
	poolElement: SQRQuestionPool;
	activePoolQuestionIndex: number;
	expanded?: boolean;
	onToggleExpanded: (familyId: string) => void;
	onNewQuestionRequested: (poolElementFamilyId: FamilyId) => void;
	onSubmit: (args: {
		poolElementFamilyId: FamilyId;
		questionFamilyId: FamilyId;
		choiceFamilyId: FamilyId;
	}) => void | Promise<void>;
	isInstructorView?: boolean;
	studentResponse?: SaveMCQuestionResponse;
	shouldShowReminder?: boolean;
}

export interface MCQRef {
	rejoinderElement: HTMLDivElement;
}

const SQRQuestionDeckMCQuestion = forwardRef<MCQRef, Props>(
	(
		{
			poolElement,
			activePoolQuestionIndex,
			expanded,
			onToggleExpanded,
			onNewQuestionRequested,
			onSubmit,
			isInstructorView,
			studentResponse,
			shouldShowReminder
		},
		ref
	) => {
		const [isSaveInProgress, setSaveInProgress] = useState(false);
		const [instructorViewActivePoolQuestionIndex, setInstructorViewActivePoolQuestionIndex] =
			useState(0);
		const question =
			poolElement.pool[
				isInstructorView ? instructorViewActivePoolQuestionIndex : activePoolQuestionIndex
			];
		const { family_id, body, choices } = question;
		const contentDivId = `${family_id}-content`;

		const [selectedChoiceFamilyId, setSelectedChoiceFamilyId] = useState<FamilyId | null>(null);
		const [seed, setSeed] = useState(0);
		const [fakeInstructorResponse, setFakeInstructorResponse] =
			useState<SaveMCQuestionResponse | null>(null);
		const response = isInstructorView ? fakeInstructorResponse : studentResponse;
		const rejoinderRef = useRef<HTMLDivElement>(null);

		useImperativeHandle(
			ref,
			() => ({
				rejoinderElement: rejoinderRef.current
			}),
			[]
		);

		const shuffledChoices = useMemo(
			() => shuffle({ list: choices, key: family_id, seed }),
			[choices, family_id, seed]
		);

		useEffect(() => {
			if (isInstructorView) {
				const correctChoice = question.choices.find((choice) => choice.is_correct);
				setFakeInstructorResponse({
					correct: true,
					rejoinder: correctChoice.rejoinder
				});
				setSelectedChoiceFamilyId(correctChoice.family_id);
			} else {
				setFakeInstructorResponse(null);
				setSelectedChoiceFamilyId(null);
			}
		}, [isInstructorView, question.choices]);

		const handleClick = useCallback(() => {
			onToggleExpanded(poolElement.family_id);
		}, [onToggleExpanded, poolElement.family_id]);

		const handleChangeSelectedChoice = useCallback((selectedChoiceFamilyId: FamilyId) => {
			setSelectedChoiceFamilyId(selectedChoiceFamilyId);
		}, []);

		const handleSubmit = async () => {
			if (isSaveInProgress) {
				return;
			}

			try {
				setSaveInProgress(true);
				await onSubmit({
					poolElementFamilyId: poolElement.family_id,
					questionFamilyId: question.family_id,
					choiceFamilyId: selectedChoiceFamilyId
				});
			} catch (e) {
				console.error('Failed to save MCQ', e);
			} finally {
				setSaveInProgress(false);
			}
		};

		const handleTryAgain = useCallback(() => {
			onNewQuestionRequested(poolElement.family_id);
		}, [onNewQuestionRequested, poolElement.family_id]);

		return (
			<div css={styles(shouldShowReminder)}>
				<Tippy
					css={nextQuestionReminderTooltipStyles}
					visible={shouldShowReminder}
					disabled={!shouldShowReminder}
					content="You’re not done yet! Click the purple arrow in the top right corner below to open additional questions."
					placement="top-end"
					arrow
					animation={false}
					offset={[0, 24]}
					maxWidth={250}>
					<button
						className="prompt-and-pivotar"
						aria-expanded={expanded}
						aria-controls={contentDivId}
						data-answered={response != null}
						onClick={handleClick}>
						<div className="correctness-and-prompt">
							{response != null && (
								<div className="correctness" data-correct={response.correct}>
									{response.correct ? (
										<FaCheck aria-label="Correct" />
									) : (
										<FaTimes aria-label="Incorrect" />
									)}
								</div>
							)}
							<QuestionPrompt body={body} />
						</div>
						{expanded ? (
							<FaChevronUp {...pivotarIconProps} />
						) : (
							<FaChevronDown {...pivotarIconProps} />
						)}
					</button>
				</Tippy>
				<div id={contentDivId} className="content" hidden={!expanded}>
					<QuestionChoices
						questionFamilyId={family_id}
						choices={isInstructorView ? choices : shuffledChoices}
						disabled={isInstructorView || response != null}
						onChangeSelectedChoice={handleChangeSelectedChoice}
						selectedChoiceFamilyId={selectedChoiceFamilyId}
					/>
					<div className="rejoinder-and-try-again">
						<div
							className="rejoinder"
							ref={rejoinderRef}
							{...(response != null
								? {
										'data-correct': response.correct
								  }
								: {})}>
							{response != null && (
								<>
									<span className="correctness">
										{response.correct ? 'Correct.' : 'Incorrect.'}
									</span>{' '}
									<span dangerouslySetInnerHTML={{ __html: response.rejoinder }} />
								</>
							)}
						</div>
						{response != null && !response.correct && (
							<div className="try-again">
								<span className="help-text">
									The Try Again button will test your knowledge with a similar multiple-choice
									question.
								</span>
								<button onClick={handleTryAgain}>Try Again</button>
							</div>
						)}
					</div>
					{!isInstructorView && response == null && (
						<div className="divider-and-save">
							<hr />
							<button
								disabled={selectedChoiceFamilyId == null || isSaveInProgress}
								onClick={handleSubmit}>
								{isSaveInProgress ? 'Saving...' : 'Save'}
							</button>
						</div>
					)}
					{isInstructorView && (
						<div className="instructor-view-pool-navigation">
							<Tippy
								arrow
								interactive
								offset={[0, 12]}
								placement="bottom"
								content={
									<div css={instructorHelpTooltipStyles}>
										This is a randomized formative assessment and each question in the pool assesses
										the same learning objective. Learn more in the{' '}
										<a href="#" target="_blank">
											support article
										</a>
										.
									</div>
								}>
								<span tabIndex={0} className="help-tooltip-trigger">
									<BsQuestionCircleFill />
								</span>
							</Tippy>
							<span>Browse pool items for this question ({poolElement.pool.length} total)</span>
							<button
								aria-label="Previous pool question"
								disabled={instructorViewActivePoolQuestionIndex === 0}
								onClick={() => setInstructorViewActivePoolQuestionIndex((old) => old - 1)}>
								<FaChevronLeft size={17} />
							</button>
							<button
								aria-label="Next pool question"
								disabled={instructorViewActivePoolQuestionIndex === poolElement.pool.length - 1}
								onClick={() => setInstructorViewActivePoolQuestionIndex((old) => old + 1)}>
								<FaChevronRight size={17} />
							</button>
						</div>
					)}
				</div>
			</div>
		);
	}
);
SQRQuestionDeckMCQuestion.displayName = 'SQRQuestionDeckMCQuestion';

export default SQRQuestionDeckMCQuestion;

const styles = (shouldShowReminder: boolean) => css`
	border: 1px solid #c9c9c9;
	border-radius: 0.5rem;
	${shouldShowReminder &&
	css`
		z-index: 100;
		background: #f5f5f5;
	`}

	.prompt-and-pivotar {
		padding: 1rem 1.5rem;
		display: grid;
		grid-template-columns: 1fr auto;
		align-items: flex-start;
		column-gap: 1.5rem;
		font: inherit;
		border: none;
		background: none;
		cursor: pointer;
		text-align: initial;

		&[aria-expanded='false'][data-answered='true'] .question-body {
			color: rgba(0, 0, 0, 0.5);
		}

		.correctness {
			display: inline-flex;
			margin-right: 0.75rem;
			align-items: baseline;
			font-size: 18px;
			line-height: 30px;
			font-weight: 500;
			font-style: italic;
			column-gap: 0.5rem;

			svg {
				position: relative;
				bottom: -2px;
			}

			&[data-correct='true'] {
				color: #007e0c;
			}

			&[data-correct='false'] {
				color: #e70000;
			}
		}

		// QuestionPrompt outer div
		div:last-of-type {
			display: inline;
		}

		// QuestionPrompt inner div
		.question-body {
			display: inline;
			margin: 0;
		}
	}

	.content {
		fieldset {
			margin: 0;
			padding: 0;
			border: none;
		}

		.question-choices {
			padding: 0 2rem;
			display: grid;
			grid-template-columns: auto 1fr;
			align-items: flex-start;
			column-gap: 1.5rem;
			row-gap: 1rem;
			font-size: 18px;
			line-height: 22px;

			> div {
				display: contents;
			}

			input[type='radio'] {
				width: 1.5rem;
				height: 1.5rem;
				accent-color: #5f01df;
			}
		}

		.divider-and-save {
			padding: 1.5rem 2rem;
		}

		hr {
			margin: 0 0 1.25rem;
			border-top: 1px solid #ccc;
			border-bottom: none;
		}

		button {
			display: flex;
			margin-left: auto;
			padding: 1rem 1.5rem;
			border: 2px solid;
			border-radius: 6px;
			font: inherit;
			font-size: 18px;
			line-height: 20px;
			font-weight: 500;
			cursor: pointer;

			&:disabled {
				border-color: #585858;
				color: #585858;
			}

			&:not(:disabled) {
				background: #5f01df;
				border-color: transparent;
				color: #fff;
			}

			&:focus {
				outline-width: 2px;
				outline-style: solid;
				outline-offset: 2px;
			}
		}

		.rejoinder-and-try-again {
			padding: 0 2rem 1rem 0;

			.rejoinder {
				font-size: 18px;
				line-height: 30px;
				font-style: italic;
				color: #5f5f5f;
				background: #fff;

				&:not(:empty) {
					margin-top: 1.5rem;
					padding: 1rem 2rem 1.5rem;
				}

				.correctness {
					font-weight: 500;
				}

				&[data-correct='true'] .correctness {
					color: #007e0c;
				}

				&[data-correct='false'] .correctness {
					color: #e70000;
				}
			}

			.try-again {
				display: grid;
				padding: 1rem 0 0.5rem 2rem;
				grid-template-columns: 1fr auto;
				align-items: center;
				column-gap: 5rem;

				.help-text {
					font-size: 14px;
					line-height: 18px;
					color: #545454;
				}
			}
		}

		.instructor-view-pool-navigation {
			display: flex;
			padding: 1.25rem 2rem 2rem 0;
			justify-content: flex-end;
			align-items: center;
			font-weight: 500;

			.tippy-box .tippy-arrow {
				top: 0;
				left: -8px !important;

				&::before,
				&::after {
					content: '';
					position: absolute;
					top: -8px;
					left: -4px;
					background: #979797;
					width: 24px;
					height: 8px;
					clip-path: polygon(0 100%, 50% 0, 100% 100%);
				}

				&::after {
					margin-top: 1px;
					background: white;
				}
			}

			.tippy-box[data-placement^='top'] .tippy-arrow {
				top: unset;
				bottom: 0;

				&::before,
				&::after {
					top: 0;
					clip-path: polygon(0 0, 50% 100%, 100% 0);
				}

				&::after {
					margin-top: -1px;
				}
			}

			.help-tooltip-trigger {
				line-height: 1;
				margin-right: 0.75rem;
				color: #5f01df;
			}

			button {
				margin: 0;
				padding: 0.25rem;
				line-height: 0;
				color: #5f01df;
				background: none;
				border: 1px solid #5f01df;
				cursor: pointer;

				&:first-of-type {
					margin-left: 0.75rem;
					border-radius: 3px 0 0 3px;
				}

				&:last-of-type {
					margin-left: -1px;
					border-radius: 0 3px 3px 0;
				}

				&:disabled {
					opacity: 0.25;
					cursor: not-allowed;
				}
			}
		}
	}
`;

const instructorHelpTooltipStyles = css`
	padding: 0.5rem 0.75rem;
	background: #fff;
	border: 1px solid #979797;
	font-weight: 400;

	a {
		color: #5f01df;
	}
`;

const nextQuestionReminderTooltipStyles = css`
	padding: 0.75rem 1rem;
	border-radius: 0.5rem;
	background: #fff;
	border: 1px solid #979797;

	.tippy-arrow {
		content: '';
		bottom: 0;
		left: unset !important;
		transform: unset !important;
		right: 6rem;

		&::before,
		&::after {
			content: '';
			position: absolute;
			top: 0;
			left: -4px;
			background: #979797;
			width: 24px;
			height: 12px;
			clip-path: polygon(0 0, 50% 100%, 100% 0);
		}

		&::after {
			margin-top: -1px;
			background: #fff;
		}
	}

	&[data-placement^='bottom'] .tippy-arrow {
		top: 0;

		&::before,
		&::after {
			top: -12px;
			clip-path: polygon(0% 100%, 50% 0, 100% 100%);
		}

		&::after {
			margin-top: 1px;
		}
	}
`;
