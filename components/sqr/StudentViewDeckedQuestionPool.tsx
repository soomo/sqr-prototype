import { useCallback, useEffect, useState } from 'react';

import { css } from '@emotion/core';

import { useAccessibilityFocus } from '@soomo/lib/hooks';

import CorrectIcon from './CorrectIcon';
import IncorrectIcon from './IncorrectIcon';
import CollapseIcon from './CollapseIcon';
import ExpandIcon from './ExpandIcon';
import Prompt from './Prompt';
import Choices from './Choices';
import Rejoinder from './Rejoinder';
import { buttonStyles, dividerStyles } from './studentViewStyles';
import TryAgain from './TryAgain';
import { useStudentView } from './useStudentView';
import { choicesStyles, deckedStyles, rejoinderStyles } from './deckedStyles';

import type { SyntheticAnswer, MCQuestion, FamilyId } from '../../types';

interface Props {
	initialQuestion: MCQuestion;
	expanded?: boolean;
	onToggleExpanded: () => void;
}

const StudentViewDeckedQuestionPool: React.VFC<Props> = ({
	initialQuestion,
	onToggleExpanded,
	expanded
}) => {
	const [activeQuestion, setActiveQuestion] = useState<MCQuestion>(initialQuestion);
	useEffect(() => {
		setActiveQuestion(initialQuestion);
	}, [initialQuestion]);
	const [choiceFamilyId, setChoiceFamilyId] = useState<FamilyId | null>(null);
	const [answer, setAnswer] = useState<SyntheticAnswer | null>(null);
	const { isRequestInProgress, performReset, performSave } = useStudentView({
		questionFamilyId: activeQuestion.familyId,
		choiceFamilyId
	});
	const [buttonRef, setFocusToButton] = useAccessibilityFocus();
	const [rejoinderRef, setFocusToRejoinder] = useAccessibilityFocus();
	const contentDivId = `${activeQuestion.familyId}-content`;

	const handleReset = useCallback(async () => {
		if (isRequestInProgress || !answer) {
			return;
		}
		const json = await performReset();
		if (json.was_reset) {
			setChoiceFamilyId(null);
			setActiveQuestion(json.new_question);
			setAnswer(null);
			setFocusToButton();
		}
	}, [answer, isRequestInProgress, performReset, setFocusToButton]);

	const handleSubmit = useCallback(async () => {
		if (isRequestInProgress || answer != null) {
			return;
		}
		const json = await performSave();
		setAnswer({
			correct: json.is_correct,
			rejoinder: json.rejoinder,
			wasFinalAttempt: json.attempts_remaining === 0
		});
		setFocusToRejoinder();
	}, [answer, isRequestInProgress, performSave, setFocusToRejoinder]);

	return (
		<div css={deckedStyles}>
			<button
				className="prompt-and-pivotar"
				aria-expanded={expanded ?? false}
				aria-controls={contentDivId}
				data-answered={answer != null}
				onClick={onToggleExpanded}
				ref={buttonRef}>
				<div className="correctness-and-prompt">
					{answer != null && (
						<div className="correctness">
							{answer.correct ? (
								<CorrectIcon aria-label="Correct." />
							) : (
								<IncorrectIcon aria-label="Incorrect." />
							)}
						</div>
					)}
					<Prompt body={activeQuestion.body} />
				</div>
				{expanded ? <CollapseIcon /> : <ExpandIcon />}
			</button>
			<div id={contentDivId} hidden={!expanded}>
				<Choices
					choices={activeQuestion.choices}
					disabled={answer != null}
					selectedChoiceFamilyId={choiceFamilyId}
					onChangeSelectedChoice={setChoiceFamilyId}
					questionFamilyId={activeQuestion.familyId}
					css={choicesStyles}
				/>
				{answer ? (
					<>
						<Rejoinder
							ref={rejoinderRef}
							rejoinder={answer.rejoinder}
							correct={answer.correct}
							css={rejoinderStyles}
						/>
						<TryAgain
							isRequestInProgress={isRequestInProgress}
							onReset={handleReset}
							css={tryAgainStyles}
						/>
					</>
				) : (
					<div css={dividerAndSaveStyles}>
						<hr css={dividerStyles} />
						<button onClick={handleSubmit} css={buttonStyles} disabled={choiceFamilyId == null}>
							{isRequestInProgress ? 'Saving...' : 'Save'}
						</button>
					</div>
				)}
			</div>
		</div>
	);
};

export default StudentViewDeckedQuestionPool;

const dividerAndSaveStyles = css`
	padding: 1.5rem 2rem;
`;

const tryAgainStyles = css`
	padding: 1rem 2rem 1.5rem 1.5rem;
`;
